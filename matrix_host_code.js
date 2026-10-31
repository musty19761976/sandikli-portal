apply(ctx) {
  const events = ctx.get('events');
  if (!events) return;
  ctx.effect(() => {
    events.on('conversation/step', (d) => console.log('Step:', d));
    return () => {};
  });
}