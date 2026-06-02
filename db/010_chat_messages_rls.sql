-- RLS for chat_messages (table had RLS on with no policies → supervisors saw zero rows)

CREATE POLICY "supervisors_own_chat_messages" ON chat_messages
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM interactions i
            JOIN agents a ON a.id = i.agent_id
            WHERE i.id = chat_messages.interaction_id
              AND a.supervisor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM interactions i
            JOIN agents a ON a.id = i.agent_id
            WHERE i.id = chat_messages.interaction_id
              AND a.supervisor_id = auth.uid()
        )
    );

CREATE POLICY "admin_full_access_chat_messages" ON chat_messages
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin
            WHERE admin."userID" = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin
            WHERE admin."userID" = auth.uid()
        )
    );
