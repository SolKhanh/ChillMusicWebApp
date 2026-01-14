package com.chillscape.dao;

import com.chillscape.db.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;

public class CollectionDAO {
    public boolean createCollection(int userID, String name) throws SQLException {
        String shareCode = UUID.randomUUID().toString().substring(0, 6);
        String sql = "INSERT INTO collections (user_id, name, share_code) VALUES (?, ?, ?)";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, userID);
            ps.setString(2, name);
            ps.setString(3, shareCode);
            return ps.executeUpdate() > 0;

        } catch (SQLException e) {
            System.err.println("Error creating collection: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }



}
