# Migration 09 reconciliation — review required

PR #11 version (`ba959f7`) is retained unchanged in the Git index and commit history. The locally modified version of `20240109_09_phase7_safety.sql` remains uncommitted in the working tree and is also preserved in the verified backup. Its exact difference from the PR version follows. No database state has been inspected or changed.

`20240111_11_phase7_followup.sql` is a proposed additive migration carrying the two behavioral differences without editing the applied-file candidate. It replaces the pause trigger/function and order function; it does not rewrite existing rows. Its safety and convergence with actual deployed definitions require independent review and isolated Supabase staging verification. Do not apply it without explicit approval.

```diff
diff --git a/supabase/migrations/20240109_09_phase7_safety.sql b/supabase/migrations/20240109_09_phase7_safety.sql
index b08c5b1..154f5f1 100644
--- a/supabase/migrations/20240109_09_phase7_safety.sql
+++ b/supabase/migrations/20240109_09_phase7_safety.sql
@@ -7 +7,4 @@ begin
- if new.provider = 'paymob' then raise exception 'online_payments_paused' using errcode='42501'; end if;
+ if new.provider = 'paymob' then
+  if tg_op = 'INSERT' then raise exception 'online_payments_paused' using errcode='42501'; end if;
+  if old.provider is distinct from 'paymob' then raise exception 'online_payments_paused' using errcode='42501'; end if;
+ end if;
@@ -11 +14 @@ revoke all on function public.phase7_block_online_payment() from public,anon,aut
-create trigger phase7_pause_online_payment before insert on public.payments for each row execute function public.phase7_block_online_payment();
+create trigger phase7_pause_online_payment before insert or update of provider on public.payments for each row execute function public.phase7_block_online_payment();
@@ -86,0 +90,4 @@ begin
+  -- Even callers that requested immediate constraints must wait until checkout
+  -- has finished inserting its payment and final server-calculated total.
+  set constraints phase7_legacy_cash_payment deferred;
+
```
