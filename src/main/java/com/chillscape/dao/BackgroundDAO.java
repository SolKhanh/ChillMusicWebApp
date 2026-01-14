package com.chillscape.dao;

import com.chillscape.db.DBConnection;
import com.chillscape.model.Background;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class BackgroundDAO {
    public List<Background> getAllBackgrounds() {
        List<Background> backgrounds = new ArrayList<>();
        String sql = "SELECT id,name,isAnimated FROM backgrounds";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Background background = new Background();
                background.setId(rs.getInt("id"));
                background.setName(rs.getString("name"));
                background.setAnimated(rs.getBoolean("isAnimated"));
                backgrounds.add(background);
            }


        } catch (SQLException e) {
            System.err.println("Error fetching songs: " + e.getMessage());
            e.printStackTrace();
        }

        return backgrounds;
    }

    public List<Background> getDefaultBackgrounds() {
        List<Background> backgrounds = new ArrayList<>();
        String sql = "SELECT b.* FROM backgrounds b JOIN collections_backgrounds cb ON b.id = cb.background_id JOIN collections c ON cb.collection_id = c.id WHERE c.user_id = 1";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                Background background = new Background();
                background.setId(rs.getInt("id"));
                background.setName(rs.getString("name"));
                background.setAnimated(rs.getBoolean("isAnimated"));
                backgrounds.add(background);
            }
        } catch (SQLException e) {
            System.err.println("Error fetching songs: " + e.getMessage());
            e.printStackTrace();
        }

        return backgrounds;
    }

    public int insertBackground(String name, boolean isAnimated) {
        String sql = "INSERT INTO backgrounds (name, isAnimated) VALUES (?, ?)";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, name);
            ps.setBoolean(2, isAnimated);
            int affectedRows = ps.executeUpdate();
            try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    return generatedKeys.getInt(1);
                }
            }

        } catch (SQLException e) {
            System.err.println("Error inserting background: " + e.getMessage());
            e.printStackTrace();
            return -1;
        }
        return -1;
    }

    public boolean addBackgroundToCollection(int collectionId, int backgroundId) {
        String sql = "INSERT INTO collections_backgrounds (collection_id, background_id) VALUES (?, ?)";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, collectionId);
            ps.setInt(2, backgroundId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error adding background to collection: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }

    public List<Map<String, Object>> getBackgroundsByCollectionId(int collectionId) {
        List<Map<String, Object>> backgrounds = new ArrayList<>();
        String sql = "SELECT b.* FROM backgrounds b " +
                "JOIN collections_backgrounds cb ON b.id = cb.background_id " +
                "WHERE cb.collection_id = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, collectionId);
            ResultSet rs = ps.executeQuery();

            while (rs.next()) {
                Map<String, Object> bg = new HashMap<>();
                bg.put("id", rs.getInt("id"));
                bg.put("name", rs.getString("name")); // Tên file ảnh
                bg.put("isAnimated", rs.getBoolean("isAnimated"));
                backgrounds.add(bg);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return backgrounds;
    }

}
