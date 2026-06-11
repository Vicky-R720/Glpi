package com.glpi.color.repository;

import com.glpi.color.model.KanbanLanguage;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface KanbanLangRepository extends JpaRepository<KanbanLanguage, Long>{
    List<KanbanLanguage> findByLang(String Language);
}
