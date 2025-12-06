package com.chillscape.model;

public class Sound {
    private int id;
    private String name;
    private String filePath;
    private String iconClass;

    public Sound() {}

    public Sound(int id, String name, String filePath, String iconClass) {
        this.id = id;
        this.name = name;
        this.filePath = filePath;
        this.iconClass = iconClass;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public String getIconClass() { return iconClass; }
    public void setIconClass(String iconClass) { this.iconClass = iconClass; }
}