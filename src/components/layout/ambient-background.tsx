export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0">
      <div className="absolute -top-[10vw] -left-[10vw] h-[30vw] w-[30vw] max-h-[400px] max-w-[400px] rounded-full blur-[120px] opacity-30 bg-emerald-400/30" />
      <div className="absolute top-[15vh] right-[5vw] h-[35vw] w-[35vw] max-h-[500px] max-w-[500px] rounded-full blur-[140px] opacity-20 bg-teal-400/20" />
    </div>
  );
}
