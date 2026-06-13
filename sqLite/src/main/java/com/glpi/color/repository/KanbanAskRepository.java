package com.glpi.color.repository;

import com.glpi.color.model.KanbanAsk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface KanbanAskRepository extends JpaRepository<KanbanAsk,Long>{

    @Query(value="SELECT * FROM kanban_price WHERE id_ticket= ?1 ORDER BY id DESC LIMIT 1" , nativeQuery = true)
    Optional<KanbanAsk> findLasByTicketID(Long ticket_id);

    @Query(value="SELECT * FROM kanban_price WHERE id_ticket = ?1 AND id_item = ?2 LIMIT 1", nativeQuery = true)
    Optional<KanbanAsk> findByIdTicketAndIdItem(long id_ticket, String id_item);

    @Query(value="SELECT * FROM kanban_price WHERE id_ticket = ?1 AND groupe = (SELECT MAX(groupe) FROM kanban_price WHERE id_ticket = ?1)", nativeQuery = true)
    List<KanbanAsk> findByTicketIdAndMaxGroupe(long id_ticket);


    @Query(value = """
        SELECT cout_saisi
        FROM kanban_price
        WHERE id_ticket = ?1
        AND type_saisi = 'super_price'
        ORDER BY groupe DESC
        LIMIT 1
        """, nativeQuery = true)
    Double findLastSuperPriceByTicketId(long id_ticket);
}
