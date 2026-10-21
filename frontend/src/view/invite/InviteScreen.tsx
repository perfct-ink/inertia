import { Button, FormError } from '@/components/ui'
import { Link, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useAcceptInvitation } from '@/api/workspaces'
import { useSwitchWorkspace } from '@/hooks/useSwitchWorkspace'
import AuthLayout from '@/components/auth/AuthLayout'
import { usePageTitle } from '@/hooks/usePageTitle'
import './InviteScreen.scss'

// Where an invite link lands. Signed in, the person chooses to join the
// Space (it only works if their account's email is the one invited);
// signed out, they are asked to sign in or sign up first, then open the link again.
export default function InviteScreen() {
  usePageTitle('Join a Space')
  const { token = '' } = useParams()
  const signedIn = !!useAuthStore((s) => s.token)
  const accept = useAcceptInvitation()
  const switchWorkspace = useSwitchWorkspace()

  if (!signedIn) {
    return (
      <AuthLayout title="You're invited to a Space">
        <div className="invite-body">
          <p className="invite-text">Sign in or create an account with the email address that was invited, then open this link again.</p>
          <div className="invite-actions">
            <Link to="/login">Sign in</Link>
            <Link to="/signup">Create an account</Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Join this Space?">
      <div className="invite-body">
        <p className="invite-text">You were invited to a Space. Joining adds it to your Spaces.</p>
        <FormError message={accept.isError ? 'This invitation is no longer valid, or it was sent to a different email address than the one you are signed in with.' : null} />
        <Button variant="primary" disabled={accept.isPending} onClick={() => accept.mutate(token, { onSuccess: switchWorkspace })}>
          Join Space
        </Button>
      </div>
    </AuthLayout>
  )
}
