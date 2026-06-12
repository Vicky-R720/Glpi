package com.glpi.color.repository;

import com.glpi.color.model.KanbanAsk;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

@Repository
public interface KanbanAskRepository extends JpaRepository<KanbanAsk,Long>{
    
}
