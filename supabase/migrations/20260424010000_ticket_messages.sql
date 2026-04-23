create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender text not null check (sender in ('user', 'admin')),
  body text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_id_created_at_idx
  on public.support_ticket_messages (ticket_id, created_at);

create index if not exists support_ticket_messages_ticket_id_sender_created_at_idx
  on public.support_ticket_messages (ticket_id, sender, created_at desc);

insert into public.support_ticket_messages (ticket_id, sender, body, created_at)
select st.id, 'admin', st.admin_note, coalesce(st.updated_at, st.created_at, now())
from public.support_tickets st
where nullif(btrim(st.admin_note), '') is not null
  and not exists (
    select 1
    from public.support_ticket_messages stm
    where stm.ticket_id = st.id
      and stm.sender = 'admin'
      and stm.body = st.admin_note
  );

create or replace function public.touch_support_ticket_updated_at_from_message()
returns trigger
language plpgsql
as $$
begin
  update public.support_tickets
  set updated_at = now()
  where id = new.ticket_id;

  return new;
end;
$$;

drop trigger if exists support_ticket_messages_touch_ticket on public.support_ticket_messages;

create trigger support_ticket_messages_touch_ticket
after insert on public.support_ticket_messages
for each row
execute function public.touch_support_ticket_updated_at_from_message();
