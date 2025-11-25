import styles from "./organization-invite.module.css";

export default function OrganizationInvitePage() {
  return (
    <main className={styles.inviteMain}>
      <div className={styles.inviteBox}>
        <h1 className={styles.title}>Organization Invitation</h1>
        <form className={styles.form}>
          <input
            type="text"
            placeholder="Invite code"
            className={styles.input}
            required
          />
          <button type="submit" className={styles.inviteButton}>
            Accept Invite
          </button>
        </form>
      </div>
    </main>
  );
}
