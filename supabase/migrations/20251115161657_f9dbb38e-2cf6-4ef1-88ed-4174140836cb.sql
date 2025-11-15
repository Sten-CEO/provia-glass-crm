-- Add DELETE policy for notifications
CREATE POLICY "Users can delete notifications"
ON public.notifications
FOR DELETE
TO public
USING (true);