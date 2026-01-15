package com.chillscape.model;

import java.sql.Timestamp;

public class Collection {
    private int id;
    private int userID;
    private String name;
    private String shareCode;
    private Timestamp createdAt;

    public Collection() {
    }

    public Collection(int id, int userID, String name, String shareCode, Timestamp createdAt) {
        this.id = id;
        this.userID = userID;
        this.name = name;
        this.shareCode = shareCode;
        this.createdAt = createdAt;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getUserID() {
        return userID;
    }

    public void setUserID(int userID) {
        this.userID = userID;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getShareCode() {
        return shareCode;
    }

    public void setShareCode(String shareCode) {
        this.shareCode = shareCode;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }
}
