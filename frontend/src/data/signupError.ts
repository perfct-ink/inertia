export type SignupField = 'name' | 'email' | 'password'

const FIELD_PREFIX = /^(name|email|password)\b/i

// Sorts the server's refusals ("Email has already been taken") by the field they
// are about, so each shows under its field. A field with several gets them joined;
// anything not about a field stays in `other`, to show above the form.
export function splitSignupErrors(messages: string[]): { fields: Partial<Record<SignupField, string>>; other: string[] } {
  const fields: Partial<Record<SignupField, string>> = {}
  const other: string[] = []
  for (const message of messages) {
    const field = FIELD_PREFIX.exec(message)?.[1].toLowerCase() as SignupField | undefined
    if (field) fields[field] = fields[field] ? `${fields[field]}. ${message}` : message
    else other.push(message)
  }
  return { fields, other }
}
