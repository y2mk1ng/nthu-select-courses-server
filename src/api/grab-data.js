const request = require('request-promise-native')
const iconv = require('iconv-lite')
const cheerio = require('cheerio')
const fs = require('fs')

function grabHelper (node, level = 0, initIndex = 0) {
  if (node instanceof Array) {
    let idx = initIndex
    for (let childNode of node) {
      grabHelper(childNode, level, idx++)
    }
  } else {
    if (node.type === 'text') {
      console.log(' '.repeat(level * 2) + '\x1b[34m' + initIndex + '\x1b[0m "' + node.data.replace(/\n/g, '\\n') + '"')
    } else {
      console.log(' '.repeat(level * 2) + '\x1b[34m' + initIndex + ' \x1b[32m<' + node.name + '>\x1b[0m')
      grabHelper(node.children, level + 1)
    }
  }
}

function grabDepartmentsByBody (body) {
  const $ = cheerio.load(body)
  let departments = {}

  // get departments
  for (let dept of $('select[name=new_dept] option').toArray()) {
    let parsedDeptName = /([A-Z0-9]+) ([^\s]+)(?: (.*))?/.exec(dept.children[0].data)
    let deptAbbr = parsedDeptName[1]
    let deptChineseName = parsedDeptName[2]
    let deptEnglishName = parsedDeptName[3] ? parsedDeptName[3] : deptAbbr
    departments[deptAbbr] = {
      abbr: deptAbbr,
      chineseName: deptChineseName,
      englishName: deptEnglishName,
      classes: []
    }
  }

  // get classes
  for (let cls of $('select[name=new_class] option').toArray()) {
    let parsedClassName = /([A-Z]+)(\s*[0-9A-Z]+)\s+([^\s]+)/.exec(cls.children[0].data)
    let deptAbbr = parsedClassName[1]
    let classLevel = parsedClassName[2]
    let className = parsedClassName[3]
    if (!departments[deptAbbr]) {
      departments[deptAbbr] = {
        abbr: deptAbbr,
        chineseName: className,
        englishName: deptAbbr,
        classes: []
      }
    }
    departments[deptAbbr].classes.push({
      abbr: deptAbbr + classLevel,
      level: classLevel.replace(' ', ''),
      name: className
    })
  }

  return departments
}

function grabCoursesByBody (body) {
  const $ = cheerio.load(body)
  let courses = {}

  for (let tr of $('table#T1 tbody tr.word').toArray()) {
    let trArray = $(tr).find('td')

    let random = 0
    let canceled = false
    let arguText = ''
    try {
      if (trArray.get(0).children[0].children.length > 5) {
        // random for 5
        arguText = trArray.get(0).children[0].children[1].attribs.onclick
        random = 5
      } else if (trArray.get(0).children[0].children.length > 3) {
        // random for 20
        arguText = trArray.get(0).children[0].children[3].attribs.onclick
        random = 20
      } else if (trArray.get(0).children[0].children.length > 2) {
        arguText = trArray.get(0).children[0].children[1].attribs.onclick
      } else {
        arguText = []
        canceled = true
      }
    } catch (e) {
      console.log(grabHelper(tr))
      process.abort()
    }
    let argus = /[^;]*;checks\(this\.form, '([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)'\);/.exec(arguText)

    let course = {
      number: trArray.get(1).children[0].children[0].data.trim(),
      title: trArray.get(2).children[0].children[0].data.trim(),
      credit: trArray.get(3).children[0].children[0].data.trim(),
      time: trArray.get(4).children[0].children[0].data.trim(),
      room: trArray.get(5).children[0].children[0].data.trim(),
      professor: trArray.get(6).children[0].children[0].data.trim(),
      size_limit: trArray.get(8).children[0].children[0].data.trim(),
      required: trArray.get(7).children[0].children[0].data.trim(),
      previous_size: trArray.get(9).children[0].children[0].data.trim(),
      prerequirement: $(trArray.get(11).children[0]).text().trim(),
      memo: $(trArray.get(12).children[0]).text().trim(),
      sc_code: !canceled && argus[2],
      sc_div: !canceled && argus[3],
      sc_real: !canceled && argus[4],
      sc_ctime: !canceled && argus[6],
      sc_glimit: !canceled && argus[8],
      sc_type: !canceled && argus[9],
      sc_pre: !canceled && argus[10],
      sc_range: !canceled && argus[11],
      random: random,
      canceled: canceled
    }
    courses[course.number] = course
  }

  return courses
}

function grabData (ACIXSTORE) {
  const url = `https://www.ccxp.nthu.edu.tw/ccxp/COURSE/JH/7/7.1/7.1.3/JH713004.php?ACIXSTORE=${ACIXSTORE}`

  const formData = {
    ACIXSTORE: ACIXSTORE,
    toChk: '2',
    new_dept: 'COTM',
    new_class: 'EECS103B',
    keyword: '',
    chks: 'code',
    ckey: '',
    chkbtn: ''
  }

  let data = {
    // 記錄各系所，並在其classes中記錄各班
    departments: {},
    // 紀錄各系、各班所開設課程，僅用`number`連結課程
    catalog: {},
    // 紀錄所有課程
    courses: {}
  }

  request({method: 'POST', url: url, formData: formData, encoding: null})
  .then(function (body) {
    if (iconv.decode(body, 'big5') === 'session is interrupted! <br>') {
      console.error('session is interrupted! when request', url)
    }
    data.departments = grabDepartmentsByBody(iconv.decode(body, 'big5'))
    let promises = []

    for (let deptAbbr in data.departments) {
      promises.push(new Promise(function (resolve, reject) {
        // get dept's courses
        request({
          method: 'POST',
          url: url,
          formData: {
            ACIXSTORE: ACIXSTORE,
            toChk: '1',
            new_dept: deptAbbr
          },
          encoding: null
        })
        .then(function (body) {
          if (iconv.decode(body, 'big5') === 'session is interrupted! <br>') {
            console.error('session is interrupted! when request new_dept', deptAbbr)
          }
          let courses = grabCoursesByBody(iconv.decode(body, 'big5'))
          for (let courseNumber in courses) {
            if (!data.catalog[deptAbbr]) {
              data.catalog[deptAbbr] = []
            }
            data.catalog[deptAbbr].push(courseNumber)

            if (!data.courses[courseNumber]) {
              data.courses[courseNumber] = courses[courseNumber]
            }
          }
          resolve()
        })
        .catch(function (err) {
          reject(err)
        })
      }))

      // get class courses
      for (let cls of data.departments[deptAbbr].classes) {
        promises.push(new Promise(function (resolve, reject) {
          request({
            method: 'POST',
            url: url,
            formData: {
              ACIXSTORE: ACIXSTORE,
              toChk: '2',
              new_class: cls.abbr
            },
            encoding: null
          })
          .then(function (body) {
            if (iconv.decode(body, 'big5') === 'session is interrupted! <br>') {
              console.error('session is interrupted! when request new_class', cls.abbr)
            }
            let courses = grabCoursesByBody(iconv.decode(body, 'big5'))
            for (let courseNumber in courses) {
              if (!data.catalog[cls.abbr]) {
                data.catalog[cls.abbr] = []
              }
              data.catalog[cls.abbr].push(courseNumber)

              if (!data.courses[courseNumber]) {
                data.courses[courseNumber] = courses[courseNumber]
              }
            }
            resolve()
          })
          .catch(function (err) {
            reject(err)
          })
        }))
      }
    }

    Promise.all(promises)
    .then(() => {
      console.log('Grabbing Data is done!')

      fs.writeFile('courses_db.json', JSON.stringify(data), 'utf8', (err) => {
        if (err) {
          console.log(err)
        }
        console.log('Write in to file!')
      })
    })
    .catch(function (err) {
      console.error(err)
    })
  })
  .catch(function (err) {
    console.error(err)
  })
}

grabData('dqkou7ejveud0ktok5o1lq3ri4')