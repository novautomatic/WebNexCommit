import { MessageCircle, Phone } from 'lucide-react';
import { whatsappUrl, telUrl, trackContact, PHONE_DISPLAY } from '../config/contact';

/** WhatsApp link with tracking. Pass className/children to style it. */
export function WhatsAppLink({ topic, placement, className, children, onClick, ...rest }) {
  return (
    <a
      href={whatsappUrl(topic)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(e) => {
        trackContact('whatsapp', placement);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/** tel: link with tracking. */
export function CallLink({ placement, className, children, onClick, ...rest }) {
  return (
    <a
      href={telUrl}
      className={className}
      onClick={(e) => {
        trackContact('call', placement);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/**
 * Sticky contact UI: bottom bar with Llamar + WhatsApp on mobile,
 * floating WhatsApp bubble on desktop.
 */
export function ContactDock({ topic }) {
  return (
    <>
      {/* Mobile bar */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-50 grid grid-cols-2 gap-2 p-3 border-t"
        style={{
          backgroundColor: 'rgba(5, 20, 34, 0.92)',
          borderColor: 'rgba(119, 165, 210, 0.16)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <CallLink
          placement="dock_mobile"
          className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white border border-white/15"
        >
          <Phone className="w-5 h-5" /> Llamar
        </CallLink>
        <WhatsAppLink
          topic={topic}
          placement="dock_mobile"
          className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white"
          style={{ backgroundColor: '#1faa53' }}
        >
          <MessageCircle className="w-5 h-5" /> WhatsApp
        </WhatsAppLink>
      </div>

      {/* Desktop bubble */}
      <WhatsAppLink
        topic={topic}
        placement="dock_desktop"
        aria-label={`Escríbenos por WhatsApp al ${PHONE_DISPLAY}`}
        className="hidden md:flex fixed bottom-6 right-6 z-50 items-center gap-2 rounded-full pl-4 pr-5 py-3 font-semibold text-white shadow-2xl hover:scale-105 transition-transform"
        style={{ backgroundColor: '#1faa53' }}
      >
        <MessageCircle className="w-6 h-6" /> Cotiza por WhatsApp
      </WhatsAppLink>
    </>
  );
}
