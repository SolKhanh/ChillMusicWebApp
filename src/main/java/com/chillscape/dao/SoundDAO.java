package com.chillscape.dao;

import com.chillscape.db.DBConnection;
import com.chillscape.model.Sound;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class SoundDAO {

    public List<Sound> getAllSounds() {
        List<Sound> sounds = new ArrayList<>();
        String sql = "SELECT id, name, file_path, icon_class FROM sounds";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Sound sound = new Sound();
                sound.setId(rs.getInt("id"));
                sound.setName(rs.getString("name"));
                sound.setFilePath(rs.getString("file_path"));
                sound.setIconClass(rs.getString("icon_class"));
                sounds.add(sound);
            }

        } catch (SQLException e) {
            System.err.println("Error fetching sounds: " + e.getMessage());
            e.printStackTrace();
        }
        return sounds;
    }
}