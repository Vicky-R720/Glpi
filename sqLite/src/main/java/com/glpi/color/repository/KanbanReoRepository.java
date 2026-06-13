package com.glpi.color.repository;

import com.glpi.color.model.KanbanReo;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

@Repository
public interface KanbanReoRepository extends JpaRepository<KanbanReo,Long>{
    
}
