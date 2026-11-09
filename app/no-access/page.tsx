export default function NoAccessPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 text-center p-8"
      style={{ background: 'var(--bg)', fontFamily: 'var(--font-cairo, Cairo, sans-serif)' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
        style={{ background: 'var(--bg-alt)' }}
      >
        🔒
      </div>
      <div className="flex flex-col gap-2">
        <h1
          className="font-semibold text-xl"
          style={{ color: 'var(--ink)' }}
        >
          لا تملك صلاحية الوصول
        </h1>
        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
          لم يتم تعيينك في أي إدارة — تواصل مع المسؤول لتفعيل حسابك
        </p>
      </div>
      <a
        href="/api/auth/signout?callbackUrl=/login"
        className="text-sm px-5 py-2 rounded-lg text-white"
        style={{ background: 'var(--accent)' }}
      >
        تسجيل الخروج
      </a>
    </div>
  )
}
