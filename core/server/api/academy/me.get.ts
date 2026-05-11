

export default defineEventHandler((event) => {
  const token = getCookie(event, 'hub_session')

  if (!token) {
    return { loggedIn: false }
  }

  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8')
    const session = JSON.parse(raw)

    if (!session.learnerId || !session.pseudo) {
      return { loggedIn: false }
    }

    return {
      loggedIn: true,
      learnerId: session.learnerId,
      pseudo: session.pseudo,
      email: session.email,
      role: session.role ?? 'student',
    }
  } catch {
    return { loggedIn: false }
  }
})
