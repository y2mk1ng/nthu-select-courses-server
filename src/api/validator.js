export default {
  username: {
    in: 'body',
    notEmpty: true,
    errorMessage: 'User name should be a string.'
  },
  userpass: {
    in: 'body',
    notEmpty: true,
    errorMessage: 'User name should be a string.'
  },
  loginToken: {
    in: 'body',
    notEmpty: true,
    errorMessage: 'Invalid login token.'
  },
  sessionToken: {
    in: 'body',
    notEmpty: true,
    errorMessage: 'Invalid session token.'
  },
  authCheckCode: {
    in: 'body',
    notEmpty: true,
    errorMessage: 'Invalid auth check code.'
  }

}
