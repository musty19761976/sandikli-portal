// Matrix Flow Plugin - Sohbet Akışı Göstergesi
// Bu plugin conversation.input.dock slotuna Matrix benzeri bir will akışı göstergesi ekler

// Host kısmı
function hostCode() {
  return {
    apply(ctx) {
      const events = ctx.get('events');
      if (!events) return;
      
      ctx.effect(() => {
        events.on('conversation/step', (data) => {
          console.log('Step completed:', data);
        });
        return function() {};
      });
    }
  };
}

// Client kısmı
function clientCode() {
  return {
    apply(ctx) {
      const slots = ctx.get('slots');
      if (!slots) return;

      const MatrixFlowPanel = function(props) {
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
            fontSize: '12px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }
        }, 
          React.createElement('div', {
            style: {
              fontWeight: 600,
              marginBottom: '4px',
              color: 'var(--color-text-primary)',
              fontSize: '13px'
            }
          }, 'Will Akışı'),
          
          React.createElement('div', {
            style: {
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              maxHeight: '120px',
              overflowY: 'auto'
            }
          }, nodes.map(function(node, i) {
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
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              },
              onMouseEnter: function(e) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
              },
              onMouseLeave: function(e) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              }
            },
              React.createElement('span', {
                style: { fontWeight: 600, color: colors[type], fontSize: '14px' }
              }, icons[type] || '📄'),
              
              React.createElement('span', {
                style: { color: 'var(--color-text-secondary)', fontSize: '12px' }
              }, String(content).substring(0, 40))
            );
          }))
        );
      };

      slots.inject('conversation.input.dock', function() {
        slots.register(
          { name: 'conversation.input.dock', id: 'matrix-flow' },
          function(props) { return MatrixFlowPanel(props); }
        );
      });
    }
  };
}

// Export for Cordis
module.exports = { hostCode, clientCode };