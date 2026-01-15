package com.chillscape.dao;

import com.chillscape.db.DBConnection;

import java.sql.*;
import java.util.*;

public class CollectionDAO {
    public boolean createCollection(int userID, String name) {
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

    public boolean subscribeCollection(int userId, String shareCode) {


        String sql = "INSERT INTO user_followed_collections (user_id, collection_id, role) VALUES (?, (SELECT id FROM collections WHERE share_code = ?), 'VIEWER')";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, userId);
            ps.setString(2, shareCode);
            return ps.executeUpdate() > 0;

        } catch (SQLIntegrityConstraintViolationException e) {
            System.err.println("User đã follow collection này rồi: " + e.getMessage());
        } catch (SQLException e) {
            System.err.println("Error subscribing collection: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }

    public List<Map<String, Object>> getMyCollections(int userId) {
        List<Map<String, Object>> list = new ArrayList<>();
        String sql = "SELECT id, name, share_code, create_at FROM collections WHERE user_id = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", rs.getInt("id"));
                    map.put("name", rs.getString("name"));
                    map.put("shareCode", rs.getString("share_code"));
                    map.put("type", "OWNER");
                    list.add(map);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return list;
    }

    public List<Map<String, Object>> getFollowedCollections(int userId) {
        List<Map<String, Object>> list = new ArrayList<>();
        // Join bảng follows với bảng collections để lấy tên
        String sql = "SELECT c.id, c.name, c.share_code, ufc.role FROM user_followed_collections ufc JOIN collections c ON ufc.collections_id = c.id WHERE ufc.user_id = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", rs.getInt("id"));
                    map.put("name", rs.getString("name"));
                    map.put("shareCode", rs.getString("share_code"));
                    map.put("type", "SUBSCRIBER");
                    list.add(map);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return list;
    }


}
