export function Atmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="mesh-drift absolute -top-56 -left-40 h-[640px] w-[640px] rounded-full opacity-55 blur-[90px] [animation:drift-a_26s_ease-in-out_infinite] [background:radial-gradient(circle_at_30%_30%,var(--color-accent),transparent_70%)]" />
      <div className="mesh-drift absolute top-[30%] -right-52 h-[520px] w-[520px] rounded-full opacity-55 blur-[90px] [animation:drift-b_32s_ease-in-out_infinite] [background:radial-gradient(circle_at_60%_40%,var(--color-accent-2),transparent_70%)]" />
      <div className="mesh-drift absolute -bottom-48 left-[20%] h-[460px] w-[460px] rounded-full opacity-55 blur-[90px] [animation:drift-c_30s_ease-in-out_infinite] [background:radial-gradient(circle_at_50%_50%,var(--color-accent-2-light),transparent_72%)]" />
    </div>
  );
}
