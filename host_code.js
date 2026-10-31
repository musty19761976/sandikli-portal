apply(ctx) {
  const events = ctx.get('events');
  if (!events) return;
  
  ctx.effect(() => {
    events.on('conversation/step', (data) => {
      console.log('Step:', data);
    });
    return () => {};
  });
}