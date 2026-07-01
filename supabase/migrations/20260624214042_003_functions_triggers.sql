CREATE OR REPLACE FUNCTION create_status_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER -- Essential: allows the trigger to bypass RLS when inserting
SET search_path = public
AS $$
DECLARE
  notification_message TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'PENDING_APPROVAL' THEN
        notification_message := 'Maombi yako yamepokelewa. Kazi inaendelea.';
      WHEN 'APPROVED' THEN
        notification_message := 'Maombi yako yameidhinishwa! Inasubiri uthibitisho.';
      WHEN 'REJECTED' THEN
        notification_message := 'Maombi yako yamekataliwa. Sababu: ' || COALESCE(NEW.rejection_reason, 'Haina jinsi.');
      WHEN 'AWAITING_VERIFICATION' THEN
        notification_message := 'Maombi yako yameidhinishwa. Mtaalamu wa kodi anafanya uthibitisho.';
      WHEN 'COMPLETED' THEN
        notification_message := 'Uhamisho wako umekamilika!';
      ELSE
        notification_message := 'Status updated to: ' || NEW.status;
    END CASE;

    INSERT INTO notifications (user_id, relocation_request_id, message, type)
    VALUES (NEW.taxpayer_id, NEW.id, notification_message,
      CASE
        WHEN NEW.status = 'COMPLETED' THEN 'success'
        WHEN NEW.status = 'REJECTED' THEN 'warning'
        ELSE 'info'
      END
    );
  END IF;
  RETURN NEW;
END;
$$;