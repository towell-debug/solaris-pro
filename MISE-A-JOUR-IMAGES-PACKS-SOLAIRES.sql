-- SOLARIS PRO — remplacement des visuels des huit packs
-- À exécuter dans Supabase > SQL Editor, puis cliquer sur Run.

update public.investment_packs
set image_url = case id
  when 'etincelle' then 'https://images.unsplash.com/photo-1756913452989-fa97f9a8ecf1?auto=format&fit=crop&w=900&q=80'
  when 'lumiere' then 'https://images.unsplash.com/photo-1574360757149-514a449c5a05?auto=format&fit=crop&w=900&q=80'
  when 'horizon' then 'https://images.unsplash.com/photo-1724994727393-1040b798a228?auto=format&fit=crop&w=900&q=80'
  when 'rayonnement' then 'https://images.unsplash.com/photo-1616007579077-22bee7dd35a5?auto=format&fit=crop&w=900&q=80'
  when 'energie' then 'https://images.unsplash.com/photo-1680355065203-43ad84bb6e69?auto=format&fit=crop&w=900&q=80'
  when 'puissance' then 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=80'
  when 'centrale' then 'https://images.unsplash.com/photo-1677273460374-ca6308b3b18e?auto=format&fit=crop&w=900&q=80'
  when 'souverain' then 'https://images.unsplash.com/photo-1658298775754-5839ffd434cc?auto=format&fit=crop&w=900&q=80'
  else image_url
end
where id in ('etincelle','lumiere','horizon','rayonnement','energie','puissance','centrale','souverain');

select id, name, image_url
from public.investment_packs
order by sort_order;
