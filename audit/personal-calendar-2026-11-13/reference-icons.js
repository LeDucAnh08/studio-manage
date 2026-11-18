
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CalendarDays, CalendarCheck2, Camera, ClipboardList, ChevronLeft, ChevronRight, Clock3, MapPin, UserRoundCheck} from 'lucide-react';
const icons={'calendar-days':CalendarDays,'calendar-check-2':CalendarCheck2,camera:Camera,'clipboard-list':ClipboardList,'chevron-left':ChevronLeft,'chevron-right':ChevronRight,'clock-3':Clock3,'map-pin':MapPin,'user-round-check':UserRoundCheck};
window.lucide={createIcons(){document.querySelectorAll('i[data-lucide]').forEach(el=>{const Icon=icons[el.dataset.lucide];if(Icon)el.outerHTML=renderToStaticMarkup(React.createElement(Icon,{'aria-hidden':true,width:16,height:16}));});}};
window.lucide.createIcons();
