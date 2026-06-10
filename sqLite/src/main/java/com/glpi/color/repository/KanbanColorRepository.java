package com.glpi.color.repository;

import com.glpi.color.model.KanbanColor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KanbanColorRepository extends JpaRepository<KanbanColor, Long> {
}
