import debug from '../src/lib/debug'
import * as selectCourse from '../src/api/select-course'
import * as scores from '../src/api/scores'
import * as user from '../src/api/user'
import response from '../src/api/response'
import validation from '../src/api/validator'

export default function initialize (app) {
  app.post('/api/:module/:method', function (req, res, next) {
    const apiRoute = {
      'user': {
        getLoginToken (req, res, next) {
          user.getLoginToken()
          .then((result) => {
            res.json(result)
          })
          .catch((err) => {
            res.json(err)
          })
        },
        getSessionToken (req, res, next) {
          req.check({
            username: validation.username,
            userpass: validation.userpass,
            loginToken: validation.loginToken,
            authCheckCode: validation.authCheckCode
          })

          req.getValidationResult().then((result) => {
            if (!result.isEmpty()) {
              res.status(400)
              .json(response.ResponseErrorMsg.ApiArgumentValidationError(result))
              return
            }

            let loginInfo = {
              username: req.body.username,
              userpass: req.body.userpass,
              loginToken: req.body.loginToken,
              authCheckCode: req.body.authCheckCode
            }

            user.getSessionToken(loginInfo)
            .then((result) => {
              res.json(result)
            })
            .catch((err) => {
              res.json(err)
            })
          })
        }
      },
      'scores': {
        getScores (req, res, next) {
          req.check({
            sessionToken: validation.sessionToken
          })

          req.getValidationResult().then((result) => {
            if (!result.isEmpty()) {
              res.status(400)
              .json(response.ResponseErrorMsg.ApiArgumentValidationError(result))
              return
            }

            let sessionToken = req.body.sessionToken

            scores.getScores(sessionToken)
            .then((result) => {
              res.json(result)
            })
            .catch((err) => {
              res.json(err)
            })
          })
        }
      },
      'select_course': {
        getCurrentSelectedCourses (req, res, next) {
          req.check({
            sessionToken: validation.sessionToken
          })

          req.getValidationResult().then((result) => {
            if (!result.isEmpty()) {
              res.status(400)
              .json(response.ResponseErrorMsg.ApiArgumentValidationError(result))
              return
            }

            let sessionToken = req.body.sessionToken

            selectCourse.getCurrentSelectedCourses(sessionToken)
            .then((result) => {
              res.json(result)
            })
            .catch((err) => {
              res.json(err)
            })
          })
        }
      }
    }

    let moduleName = req.params.module
    let methodName = req.params.method
    if (moduleName in apiRoute && methodName in apiRoute[moduleName]) {
      apiRoute[moduleName][methodName](req, res, next)
    } else {
      res.json(response.ResponseErrorMsg.ApiModuleNotExist(moduleName))
    }
  })

  app.get('/echo', function (req, res, next) {
    // res.render('echo')
  })

  app.get('*', function (req, res, next) {
    res.status(404)
    // res.render('error/404')
  })
}
