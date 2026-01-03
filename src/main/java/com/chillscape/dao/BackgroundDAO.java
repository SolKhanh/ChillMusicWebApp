package com.chillscape.dao;

import com.chillscape.db.DBConnection;
import com.chillscape.model.Background;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

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


}
