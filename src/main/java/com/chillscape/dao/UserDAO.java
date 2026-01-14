package com.chillscape.dao;

import com.chillscape.db.DBConnection;
import com.chillscape.model.User;
import com.chillscape.utils.PasswordUtil;

import java.sql.*;

public class UserDAO {
    private final CollectionDAO collectionDAO = new CollectionDAO();


    public boolean register(User user) throws SQLException {
        String sql = "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";

        String salt = PasswordUtil.getSalt();
        String hashedPassword = PasswordUtil.hashPassword(user.getPassword(), salt);
        String password = salt + "$" + hashedPassword;

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, user.getUsername());
            ps.setString(2, password);
            ps.setString(3, "USER");

            int affectedRows = ps.executeUpdate();

            if (affectedRows == 0) return false;
            try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    int userId = generatedKeys.getInt(1);
                    collectionDAO.createCollection(userId, "My Collection");
                    return true;
                } else {
                    return false;
                }
            }
        }
    }

    public User login(String username, String rawPassword) throws SQLException {
        String sql = "SELECT * FROM users WHERE username = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    String storedPassword = rs.getString("password");
                    String[] parts = storedPassword.split("\\$");
                    if (parts.length == 2) {
                        String salt = parts[0];
                        String hashedPassword = parts[1];

                        String hashedRawPassword = PasswordUtil.hashPassword(rawPassword, salt);

                        if (hashedPassword.equals(hashedRawPassword)) {
                            return new User(rs.getInt("id"), username, null);
                        }
                    }
                }
            }

        } catch (SQLException e) {
            System.err.println("Error fetching user: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
}
