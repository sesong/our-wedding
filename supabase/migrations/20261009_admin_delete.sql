-- Enable per-entry deletion from the authenticated admin page.
-- Existing submissions are preserved.

grant delete on public.guestbook_entries to authenticated;
grant delete on public.rsvp_responses to authenticated;

drop policy if exists "Moderators delete entries" on public.guestbook_entries;
create policy "Moderators delete entries"
on public.guestbook_entries for delete
to authenticated
using ((select private.is_guestbook_admin()));

drop policy if exists "Moderators delete RSVP responses" on public.rsvp_responses;
create policy "Moderators delete RSVP responses"
on public.rsvp_responses for delete
to authenticated
using ((select private.is_guestbook_admin()));
