// Who sees the Admin dashboard entry in the app. This only hides the link;
// the server checks the same list (ADMIN_EMAILS) on every admin request.
const ADMIN_EMAILS = ['jashwanthjavili7@gmail.com']

export const isAdminUser = (user) =>
  Boolean(user?.emailVerified && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))
