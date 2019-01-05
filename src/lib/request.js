import req from 'request-promise-native'
import iconv from 'iconv-lite'
import querystring from 'query-string'
import { Exception } from './debug'

export function request (...argu) {
  return req(...argu)
}

export function correctRequest (argu) {
  return new Promise((resolve, reject) => {
    if (typeof argu !== 'object') {
      reject(new Exception('correctRequest: argu should be an object.'))
    }

    argu.encoding = null

    request(argu)
    .then(function (body) {
      resolve(iconv.decode(body, 'big5'))
    })
    .catch(function (err) {
      console.error(err)
      reject(err)
    })
  })
}

export function correctFormRequest (argu) {
  if (argu.formData) {
    let formDataString = querystring.stringify(argu.formData).replace(/%20/g, '+')
    argu.body = formDataString
    if (!argu.headers) {
      argu.headers = {}
    }
    argu.headers['Content-Length'] = formDataString.length
    argu.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    argu.method = 'POST'
    delete argu.formData
  }

  return new Promise((resolve, reject) => {
    if (typeof argu !== 'object') {
      reject(new Exception('correctRequest: argu should be an object.'))
    }

    argu.encoding = null

    req(argu)
    .then(function (body) {
      resolve(iconv.decode(body, 'big5'))
    })
    .catch(function (err) {
      console.error(err)
      reject(err)
    })
  })
}
