-- SOLARIS PRO — base séparée de Housing's YQD
-- À exécuter une seule fois dans le SQL Editor du projet Solaris Pro.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists balance numeric(18,2) not null default 0 check (balance >= 0);
alter table public.profiles add column if not exists total_deposited numeric(18,2) not null default 0;
alter table public.profiles add column if not exists total_invested numeric(18,2) not null default 0;
alter table public.profiles add column if not exists total_referral_bonus numeric(18,2) not null default 0;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
create unique index if not exists profiles_referral_code_key on public.profiles(referral_code) where referral_code is not null;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','support_agent','admin','super_admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.user_roles where user_id=auth.uid() and role in ('admin','super_admin')); $$;

create table if not exists public.investment_packs (
  id text primary key,
  name text not null,
  amount numeric(18,2) not null check (amount > 0),
  daily_income numeric(18,2) not null check (daily_income >= 0),
  total_income numeric(18,2) not null check (total_income >= 0),
  duration_days integer not null default 100 check (duration_days > 0),
  daily_rate numeric(6,2) not null,
  image_url text,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.investment_packs(id,name,amount,daily_income,total_income,duration_days,daily_rate,sort_order,is_active)
values
('etincelle','Étincelle',3000,450,45000,100,15,1,true),
('lumiere','Lumière',10000,1600,160000,100,16,2,true),
('horizon','Horizon',20000,3400,340000,100,17,3,true),
('rayonnement','Rayonnement',45000,8100,810000,100,18,4,true),
('energie','Énergie',100000,19000,1900000,100,19,5,true),
('puissance','Puissance',200000,40000,4000000,100,20,6,true),
('centrale','Centrale',400000,84000,8400000,100,21,7,true),
('souverain','Souverain',800000,176000,17600000,100,22,8,true)
on conflict(id) do update set name=excluded.name,amount=excluded.amount,daily_income=excluded.daily_income,total_income=excluded.total_income,duration_days=excluded.duration_days,daily_rate=excluded.daily_rate,sort_order=excluded.sort_order,is_active=excluded.is_active;

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gross_amount numeric(18,2) not null check (gross_amount >= 500),
  fee_amount numeric(18,2) not null default 0,
  net_amount numeric(18,2) not null,
  method text not null default 'Wave',
  payment_reference text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists deposits_method_reference_unique_idx on public.deposits(lower(method),lower(payment_reference));
create unique index if not exists deposits_one_pending_per_user_idx on public.deposits(user_id) where status='pending';

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gross_amount numeric(18,2) not null check (gross_amount >= 1000),
  fee_amount numeric(18,2) not null default 0,
  net_amount numeric(18,2) not null,
  method text not null default 'Wave',
  destination_phone text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists withdrawals_one_pending_per_user_idx on public.withdrawals(user_id) where status='pending';

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_id text not null references public.investment_packs(id),
  pack_name text not null,
  amount numeric(18,2) not null,
  daily_income numeric(18,2) not null,
  total_income numeric(18,2) not null,
  duration_days integer not null,
  credited_days integer not null default 0,
  total_credited numeric(18,2) not null default 0,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  started_at timestamptz not null default now(),
  last_credit_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  related_type text,
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','taken','answered','closed')),
  admin_reply text,
  taken_by uuid references auth.users(id),
  taken_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.support_ticket_events (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  user_id uuid references auth.users(id),
  actor_role text not null,
  actor_name text,
  event_type text not null default 'replied',
  message text not null,
  created_at timestamptz not null default now()
);
alter table public.support_ticket_events add column if not exists actor_name text;
alter table public.support_ticket_events add column if not exists event_type text not null default 'replied';

create table if not exists public.phone_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  old_phone text,
  new_phone text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.profiles(id),
  referred_id uuid not null references public.profiles(id),
  deposit_id uuid not null references public.deposits(id),
  deposit_amount numeric(18,2) not null,
  reward_rate numeric(6,4) not null default .10,
  reward_amount numeric(18,2) not null,
  created_at timestamptz not null default now(),
  unique(referred_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id),
  admin_name text,
  action text not null,
  entity_type text,
  entity_id text,
  previous_status text,
  new_status text,
  created_at timestamptz not null default now()
);

create table if not exists public.fraud_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  alert_type text not null,
  severity text not null default 'medium',
  message text not null,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.support_agents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
declare sponsor uuid; code text;
begin
  code := 'SPR' || upper(substr(md5(new.id::text),1,8));
  select id into sponsor from public.profiles where referral_code=upper(coalesce(new.raw_user_meta_data->>'referral_code_entered','')) limit 1;
  insert into public.profiles(id,full_name,phone,country,email,referral_code,referred_by)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'phone',''),coalesce(new.raw_user_meta_data->>'country','CI'),coalesce(new.email,''),code,sponsor)
  on conflict(id) do update set email=excluded.email,full_name=excluded.full_name,phone=excluded.phone;
  insert into public.user_roles(user_id,role) values(new.id,'user') on conflict(user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.update_my_profile(p_full_name text,p_phone text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin update profiles set full_name=trim(p_full_name),phone=trim(p_phone),updated_at=now() where id=auth.uid(); return jsonb_build_object('success',true); end $$;

create or replace function public.request_deposit(p_amount numeric,p_method text,p_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare row_id uuid;
begin
  if auth.uid() is null then raise exception 'Utilisateur non connecté'; end if;
  if p_amount < 500 then raise exception 'Montant minimum : 500 FCFA'; end if;
  insert into deposits(user_id,gross_amount,fee_amount,net_amount,method,payment_reference)
  values(auth.uid(),p_amount,0,p_amount,coalesce(nullif(trim(p_method),''),'Wave'),trim(p_reference)) returning id into row_id;
  return jsonb_build_object('success',true,'id',row_id,'message','Dépôt en attente de validation.');
end $$;

create or replace function public.request_withdrawal(p_amount numeric,p_method text,p_destination_phone text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare available numeric; row_id uuid; last_request timestamptz;
begin
  if auth.uid() is null then raise exception 'Utilisateur non connecté'; end if;
  if p_amount < 1000 then raise exception 'Montant minimum : 1 000 FCFA'; end if;
  select balance into available from profiles where id=auth.uid() for update;
  if available < p_amount then raise exception 'Solde insuffisant'; end if;
  select max(created_at) into last_request from withdrawals where user_id=auth.uid();
  if last_request is not null and last_request > now()-interval '24 hours' then raise exception 'Un seul retrait est autorisé toutes les 24 heures'; end if;
  insert into withdrawals(user_id,gross_amount,fee_amount,net_amount,method,destination_phone)
  values(auth.uid(),p_amount,0,p_amount,coalesce(nullif(trim(p_method),''),'Wave'),trim(p_destination_phone)) returning id into row_id;
  return jsonb_build_object('success',true,'id',row_id,'message','Retrait en attente de validation.');
end $$;

create or replace function public.invest_in_pack(p_pack_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p investment_packs%rowtype; available numeric; row_id uuid;
begin
  select * into p from investment_packs where id=p_pack_id and is_active=true;
  if p.id is null then raise exception 'Pack indisponible'; end if;
  select balance into available from profiles where id=auth.uid() for update;
  if available < p.amount then raise exception 'Solde insuffisant'; end if;
  update profiles set balance=balance-p.amount,total_invested=total_invested+p.amount,updated_at=now() where id=auth.uid();
  insert into investments(user_id,pack_id,pack_name,amount,daily_income,total_income,duration_days)
  values(auth.uid(),p.id,p.name,p.amount,p.daily_income,p.total_income,p.duration_days) returning id into row_id;
  return jsonb_build_object('success',true,'id',row_id,'message','Pack activé.');
end $$;

create or replace function public.create_support_ticket(p_subject text,p_message text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare row_id uuid;
begin
  insert into support_tickets(user_id,subject,message) values(auth.uid(),trim(p_subject),trim(p_message)) returning id into row_id;
  insert into support_ticket_events(ticket_id,user_id,actor_role,actor_name,event_type,message) values(row_id,auth.uid(),'user',(select full_name from profiles where id=auth.uid()),'created',trim(p_message));
  return jsonb_build_object('success',true,'id',row_id);
end $$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$ begin update notifications set is_read=true where id=p_notification_id and user_id=auth.uid(); return jsonb_build_object('success',true); end $$;
create or replace function public.mark_all_notifications_read()
returns jsonb language plpgsql security definer set search_path=public as $$ begin update notifications set is_read=true where user_id=auth.uid(); return jsonb_build_object('success',true); end $$;

create or replace function public.admin_review_deposit(p_deposit_id uuid,p_approve boolean,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare d deposits%rowtype; bonus numeric; sponsor uuid;
begin
  if not is_admin() then raise exception 'Accès administrateur refusé'; end if;
  select * into d from deposits where id=p_deposit_id for update;
  if d.status <> 'pending' then raise exception 'Opération déjà traitée'; end if;
  update deposits set status=case when p_approve then 'approved' else 'rejected' end,admin_note=p_note,reviewed_by=auth.uid(),reviewed_at=now() where id=p_deposit_id;
  if p_approve then
    update profiles set balance=balance+d.net_amount,total_deposited=total_deposited+d.net_amount,updated_at=now() where id=d.user_id;
    select referred_by into sponsor from profiles where id=d.user_id;
    if sponsor is not null and not exists(select 1 from referral_rewards where referred_id=d.user_id) then
      bonus := round(d.net_amount*.10,2);
      insert into referral_rewards(sponsor_id,referred_id,deposit_id,deposit_amount,reward_amount) values(sponsor,d.user_id,d.id,d.net_amount,bonus);
      update profiles set balance=balance+bonus,total_referral_bonus=total_referral_bonus+bonus where id=sponsor;
    end if;
  end if;
  insert into notifications(user_id,title,message,related_type,related_id) values(d.user_id,case when p_approve then 'Dépôt validé' else 'Dépôt refusé' end,case when p_approve then 'Votre dépôt Wave a été crédité.' else 'Votre dépôt Wave a été refusé.' end,'deposit',d.id);
  insert into audit_logs(admin_id,action,entity_type,entity_id,previous_status,new_status) values(auth.uid(),'review_deposit','deposit',d.id::text,'pending',case when p_approve then 'approved' else 'rejected' end);
  return jsonb_build_object('success',true);
end $$;

create or replace function public.admin_review_withdrawal(p_withdrawal_id uuid,p_approve boolean,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare w withdrawals%rowtype; available numeric;
begin
  if not is_admin() then raise exception 'Accès administrateur refusé'; end if;
  select * into w from withdrawals where id=p_withdrawal_id for update;
  if w.status <> 'pending' then raise exception 'Opération déjà traitée'; end if;
  if p_approve then
    select balance into available from profiles where id=w.user_id for update;
    if available < w.gross_amount then raise exception 'Solde insuffisant'; end if;
    update profiles set balance=balance-w.gross_amount,updated_at=now() where id=w.user_id;
  end if;
  update withdrawals set status=case when p_approve then 'approved' else 'rejected' end,admin_note=p_note,reviewed_by=auth.uid(),reviewed_at=now() where id=p_withdrawal_id;
  insert into notifications(user_id,title,message,related_type,related_id) values(w.user_id,case when p_approve then 'Retrait validé' else 'Retrait refusé' end,case when p_approve then 'Votre retrait a été validé.' else 'Votre retrait a été refusé.' end,'withdrawal',w.id);
  insert into audit_logs(admin_id,action,entity_type,entity_id,previous_status,new_status) values(auth.uid(),'review_withdrawal','withdrawal',w.id::text,'pending',case when p_approve then 'approved' else 'rejected' end);
  return jsonb_build_object('success',true);
end $$;

create or replace function public.get_approved_deposit_ticker_page(p_offset integer default 0,p_limit integer default 20,p_snapshot timestamptz default null)
returns table(masked_phone text,amount numeric,snapshot_at timestamptz) language sql security definer set search_path=public as $$
  select case when length(p.phone)>6 then left(p.phone,4)||'****'||right(p.phone,2) else 'Client' end,d.net_amount,coalesce(p_snapshot,now())
  from deposits d join profiles p on p.id=d.user_id where d.status='approved' and d.created_at<=coalesce(p_snapshot,now()) order by d.created_at desc offset greatest(p_offset,0) limit least(greatest(p_limit,1),50);
$$;

create or replace function public.get_approved_deposit_ticker(p_limit integer default 20)
returns table(masked_phone text,amount numeric) language sql security definer set search_path=public as $$
  select case when length(p.phone)>6 then left(p.phone,4)||'****'||right(p.phone,2) else 'Client' end,d.net_amount from deposits d join profiles p on p.id=d.user_id where d.status='approved' order by d.created_at desc limit least(greatest(p_limit,1),50);
$$;

create or replace function public.request_phone_change(p_new_phone text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare current_phone text; row_id uuid;
begin
  select phone into current_phone from profiles where id=auth.uid();
  insert into phone_change_requests(user_id,old_phone,new_phone) values(auth.uid(),current_phone,trim(p_new_phone)) returning id into row_id;
  return jsonb_build_object('success',true,'id',row_id);
end $$;

create or replace function public.admin_review_phone_change(p_request_id uuid,p_approve boolean,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r phone_change_requests%rowtype;
begin
  if not is_admin() then raise exception 'Accès administrateur refusé'; end if;
  select * into r from phone_change_requests where id=p_request_id for update;
  if r.status<>'pending' then raise exception 'Demande déjà traitée'; end if;
  update phone_change_requests set status=case when p_approve then 'approved' else 'rejected' end,admin_note=p_note where id=p_request_id;
  if p_approve then update profiles set phone=r.new_phone,updated_at=now() where id=r.user_id; end if;
  return jsonb_build_object('success',true);
end $$;

create or replace function public.get_my_referral_rewards()
returns table(id uuid,deposit_amount numeric,reward_rate numeric,reward_amount numeric,referred_name text,created_at timestamptz)
language sql security definer set search_path=public as $$
 select r.id,r.deposit_amount,r.reward_rate,r.reward_amount,p.full_name,r.created_at from referral_rewards r join profiles p on p.id=r.referred_id where r.sponsor_id=auth.uid() order by r.created_at desc;
$$;

create or replace function public.admin_get_referral_rewards()
returns table(id uuid,deposit_amount numeric,reward_rate numeric,reward_amount numeric,sponsor_name text,referred_name text,created_at timestamptz)
language sql security definer set search_path=public as $$
 select r.id,r.deposit_amount,r.reward_rate,r.reward_amount,s.full_name,p.full_name,r.created_at from referral_rewards r join profiles s on s.id=r.sponsor_id join profiles p on p.id=r.referred_id where is_admin() order by r.created_at desc;
$$;

create or replace function public.hyqd_get_support_tickets(p_offset integer default 0,p_limit integer default 200)
returns table(id uuid,user_id uuid,subject text,message text,status text,admin_reply text,taken_at timestamptz,replied_at timestamptz,created_at timestamptz,requester_name text)
language sql security definer set search_path=public as $$
 select t.id,t.user_id,t.subject,t.message,t.status,t.admin_reply,t.taken_at,t.replied_at,t.created_at,p.full_name from support_tickets t join profiles p on p.id=t.user_id where is_admin() or exists(select 1 from support_agents a where a.user_id=auth.uid() and a.enabled) order by t.created_at desc offset greatest(p_offset,0) limit least(greatest(p_limit,1),200);
$$;

create or replace function public.admin_take_support_ticket(p_ticket_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not (is_admin() or exists(select 1 from support_agents where user_id=auth.uid() and enabled)) then raise exception 'Accès assistance refusé'; end if;
  update support_tickets set taken_by=auth.uid(),taken_at=coalesce(taken_at,now()),status=case when status='open' then 'taken' else status end where id=p_ticket_id;
  insert into support_ticket_events(ticket_id,user_id,actor_role,actor_name,event_type,message) values(p_ticket_id,auth.uid(),'staff',coalesce((select full_name from profiles where id=auth.uid()),'Assistance Solaris Pro'),'taken','Ticket pris en charge');
  return jsonb_build_object('success',true);
end $$;

create or replace function public.admin_reply_support_ticket(p_ticket_id uuid,p_reply text,p_close boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare owner_id uuid;
begin
  if not (is_admin() or exists(select 1 from support_agents where user_id=auth.uid() and enabled)) then raise exception 'Accès assistance refusé'; end if;
  select user_id into owner_id from support_tickets where id=p_ticket_id;
  update support_tickets set admin_reply=trim(p_reply),replied_at=now(),status=case when p_close then 'closed' else 'answered' end where id=p_ticket_id;
  insert into support_ticket_events(ticket_id,user_id,actor_role,actor_name,event_type,message) values(p_ticket_id,auth.uid(),'staff',coalesce((select full_name from profiles where id=auth.uid()),'Assistance Solaris Pro'),case when p_close then 'closed' else 'replied' end,trim(p_reply));
  insert into notifications(user_id,title,message,related_type,related_id) values(owner_id,'Réponse de l’assistance','Une réponse est disponible dans votre ticket.','support_ticket',p_ticket_id);
  return jsonb_build_object('success',true);
end $$;

create or replace function public.admin_get_audit_logs()
returns setof public.audit_logs language sql security definer set search_path=public as $$ select * from audit_logs where is_admin() order by created_at desc limit 500; $$;
create or replace function public.admin_get_fraud_alerts()
returns setof public.fraud_alerts language sql security definer set search_path=public as $$ select * from fraud_alerts where is_admin() order by created_at desc limit 500; $$;
create or replace function public.admin_resolve_fraud_alert(p_alert_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$ begin if not is_admin() then raise exception 'Accès refusé'; end if; update fraud_alerts set is_resolved=true where id=p_alert_id; return jsonb_build_object('success',true); end $$;
create or replace function public.hyqd_record_admin_access()
returns void language plpgsql security definer set search_path=public as $$ begin if not is_admin() then raise exception 'Accès refusé'; end if; insert into audit_logs(admin_id,action,entity_type) values(auth.uid(),'admin_access','session'); end $$;
create or replace function public.hyqd_record_support_access()
returns void language plpgsql security definer set search_path=public as $$ begin if not exists(select 1 from support_agents where user_id=auth.uid() and enabled) then raise exception 'Accès refusé'; end if; insert into audit_logs(admin_id,action,entity_type) values(auth.uid(),'support_access','session'); end $$;

create or replace function public.hyqd_admin_support_agents()
returns table(id uuid,name text,email text,enabled boolean) language sql security definer set search_path=public as $$
 select a.user_id,p.full_name,p.email,a.enabled from support_agents a join profiles p on p.id=a.user_id where is_admin() order by p.full_name;
$$;

create or replace function public.hyqd_admin_support_activity(p_actor uuid default null,p_from date default null,p_to date default null,p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb; totals jsonb;
begin
 if not is_admin() then raise exception 'Accès refusé'; end if;
 select jsonb_build_object('taken',count(*) filter(where event_type='taken'),'replies',count(*) filter(where event_type='replied'),'closed',count(*) filter(where event_type='closed'),'events',count(*)) into totals
 from support_ticket_events e where (p_actor is null or e.user_id=p_actor) and (p_from is null or e.created_at>=p_from) and (p_to is null or e.created_at<p_to+1);
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (
   select e.id,e.ticket_id,e.event_type,e.actor_name,e.message,e.created_at,t.subject from support_ticket_events e join support_tickets t on t.id=e.ticket_id
   where (p_actor is null or e.user_id=p_actor) and (p_from is null or e.created_at>=p_from) and (p_to is null or e.created_at<p_to+1)
   order by e.created_at desc offset greatest(p_offset,0) limit least(greatest(p_limit,1),100)
 ) x;
 return jsonb_build_object('success',true,'totals',totals,'events',result);
end $$;

insert into storage.buckets(id,name,public,file_size_limit) values('support-attachments','support-attachments',false,20971520) on conflict(id) do update set public=false,file_size_limit=20971520;
drop policy if exists "support_upload_own_folder" on storage.objects;
create policy "support_upload_own_folder" on storage.objects for insert to authenticated with check(bucket_id='support-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "support_read_own_or_admin" on storage.objects;
create policy "support_read_own_or_admin" on storage.objects for select to authenticated using(bucket_id='support-attachments' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin() or exists(select 1 from support_agents where user_id=auth.uid() and enabled)));
drop policy if exists "support_delete_own_or_admin" on storage.objects;
create policy "support_delete_own_or_admin" on storage.objects for delete to authenticated using(bucket_id='support-attachments' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin() or exists(select 1 from support_agents where user_id=auth.uid() and enabled)));

alter table public.user_roles enable row level security;
alter table public.investment_packs enable row level security;
alter table public.deposits enable row level security;
alter table public.withdrawals enable row level security;
alter table public.investments enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_events enable row level security;
alter table public.phone_change_requests enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.audit_logs enable row level security;
alter table public.fraud_alerts enable row level security;
alter table public.support_agents enable row level security;

drop policy if exists "packs_public_read" on public.investment_packs;
create policy "packs_public_read" on public.investment_packs for select using(is_active=true);
drop policy if exists "roles_read_own" on public.user_roles;
create policy "roles_read_own" on public.user_roles for select to authenticated using(user_id=auth.uid() or is_admin());
drop policy if exists "deposits_read_own" on public.deposits;
create policy "deposits_read_own" on public.deposits for select to authenticated using(user_id=auth.uid() or is_admin());
drop policy if exists "withdrawals_read_own" on public.withdrawals;
create policy "withdrawals_read_own" on public.withdrawals for select to authenticated using(user_id=auth.uid() or is_admin());
drop policy if exists "investments_read_own" on public.investments;
create policy "investments_read_own" on public.investments for select to authenticated using(user_id=auth.uid() or is_admin());
drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications for select to authenticated using(user_id=auth.uid() or is_admin());
drop policy if exists "tickets_read_own" on public.support_tickets;
create policy "tickets_read_own" on public.support_tickets for select to authenticated using(user_id=auth.uid() or is_admin());
drop policy if exists "events_read_ticket_owner" on public.support_ticket_events;
create policy "events_read_ticket_owner" on public.support_ticket_events for select to authenticated using(exists(select 1 from support_tickets t where t.id=ticket_id and (t.user_id=auth.uid() or is_admin() or exists(select 1 from support_agents a where a.user_id=auth.uid() and a.enabled))));
drop policy if exists "phone_changes_read_own" on public.phone_change_requests;
create policy "phone_changes_read_own" on public.phone_change_requests for select to authenticated using(user_id=auth.uid() or is_admin());
drop policy if exists "rewards_read_own" on public.referral_rewards;
create policy "rewards_read_own" on public.referral_rewards for select to authenticated using(sponsor_id=auth.uid() or referred_id=auth.uid() or is_admin());
drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read" on public.profiles for select to authenticated using(id=auth.uid() or is_admin());

grant execute on function public.update_my_profile(text,text) to authenticated;
grant execute on function public.request_deposit(numeric,text,text) to authenticated;
grant execute on function public.request_withdrawal(numeric,text,text) to authenticated;
grant execute on function public.invest_in_pack(text) to authenticated;
grant execute on function public.create_support_ticket(text,text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.admin_review_deposit(uuid,boolean,text) to authenticated;
grant execute on function public.admin_review_withdrawal(uuid,boolean,text) to authenticated;
grant execute on function public.get_approved_deposit_ticker_page(integer,integer,timestamptz) to authenticated;
grant execute on function public.get_approved_deposit_ticker(integer) to authenticated;
grant execute on function public.request_phone_change(text) to authenticated;
grant execute on function public.admin_review_phone_change(uuid,boolean,text) to authenticated;
grant execute on function public.get_my_referral_rewards() to authenticated;
grant execute on function public.admin_get_referral_rewards() to authenticated;
grant execute on function public.hyqd_get_support_tickets(integer,integer) to authenticated;
grant execute on function public.admin_take_support_ticket(uuid) to authenticated;
grant execute on function public.admin_reply_support_ticket(uuid,text,boolean) to authenticated;
grant execute on function public.admin_get_audit_logs() to authenticated;
grant execute on function public.admin_get_fraud_alerts() to authenticated;
grant execute on function public.admin_resolve_fraud_alert(uuid) to authenticated;
grant execute on function public.hyqd_record_admin_access() to authenticated;
grant execute on function public.hyqd_record_support_access() to authenticated;
grant execute on function public.hyqd_admin_support_agents() to authenticated;
grant execute on function public.hyqd_admin_support_activity(uuid,date,date,integer,integer) to authenticated;
grant select on public.profiles,public.user_roles,public.investment_packs,public.deposits,public.withdrawals,public.investments,public.notifications,public.support_tickets,public.support_ticket_events,public.phone_change_requests,public.referral_rewards,public.audit_logs,public.fraud_alerts,public.support_agents to authenticated;

-- Créez le premier administrateur seulement après son inscription :
-- insert into public.user_roles(user_id,role)
-- select id,'super_admin' from auth.users where email='VOTRE_EMAIL' on conflict(user_id) do update set role='super_admin';
