export default function SidebarProfileCard({ user, onLogout }) {
  if (!user) {
    return null;
  }

  const joinedOn = user.dateOfJoining
    ? new Date(user.dateOfJoining).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";

  return (
    <section className="pro-sidebar-profile">
      <div className="pro-sidebar-profile-header">
        <div className="pro-sidebar-avatar">{user.name?.[0] || "U"}</div>
        <div>
          <strong>{user.name}</strong>
          <p>{user.email}</p>
        </div>
      </div>
      <div className="pro-sidebar-profile-meta">
        <div>
          <span>Role</span>
          <strong>{user.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}` : "-"}</strong>
        </div>
        <div>
          <span>Joined</span>
          <strong>{joinedOn}</strong>
        </div>
      </div>
      <button className="pro-btn pro-btn-sidebar" onClick={onLogout}>
        Logout
      </button>
    </section>
  );
}