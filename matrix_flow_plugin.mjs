// Host kısmı - Sohbet adımlarını dinler
const hostCode = `return { 
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
}`;

// Client kısmı - Sohbet akışı göstergesi
const clientCode = `return { 
  apply(ctx) { 
    const slots = ctx.get('slots');
    if (!slots) return;

    const MatrixFlowPanel = (props) => {
      const session = props.session;
      if (!session || !session.conversation) return null;
      
      const nodes = session.conversation.nodes || [];
      
      const icons = {
        user: '👤',
        assistant: '🤖',
        'tool-call': '🔧',
        'tool-response': '✅'
      };
      
      const colors = {
        user: 'var(--color-success)',
        assistant: 'var(--color-info)',
        'tool-call': 'var(--color-warning)',
        'tool-response': 'var(--color-success)'
      };
      
      return React.createElement('div', {
        style: {
          padding: '8px 12px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '6px',
          marginBottom: '4px',
          fontSize: '12px'
        }
      }, 
        React.createElement('div', {
          style: {
            fontWeight: 600,
            marginBottom: '4px',
            color: 'var(--color-text-primary)'
          }
        }, 'Will Akışı'),
        
        React.createElement('div', {
          style: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }
        }, nodes.map((node, i) => {
          const type = node.kind || 'unknown';
          const content = node.content || (node.name ? node.name : (node.result ? node.result : '...'));
          
          return React.createElement('div', {
            key: i,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '4px'
            }
          },
            React.createElement('span', {
              style: { fontWeight: 600, color: colors[type] }
            }, icons[type] || '📄'),
            
            React.createElement('span', null, String(content).substring(0, 40))
          );
        }))
      );
    };

    slots.inject('conversation.input.dock', () => {
      slots.register(
        { name: 'conversation.input.dock', id: 'matrix-flow' },
        (props) => MatrixFlowPanel(props)
      );
    });
  }
}`;

export { hostCode, clientCode };