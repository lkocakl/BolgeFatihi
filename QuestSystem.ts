import { Quest } from './AuthContext';

export const QUEST_TYPES = {
    DISTANCE: 'DISTANCE', // Hedef: KM
    TIME: 'TIME',         // Hedef: Dakika
    SCORE: 'SCORE',       // Hedef: Puan
    CONQUER: 'CONQUER'    // Hedef: Rota Sayısı (Adet)
};

// Rastgele görev üretici
export const generateDailyQuests = (): Quest[] => {
    const quests: Quest[] = [
        {
            id: 'q_dist_' + Date.now(),
            type: 'DISTANCE',
            target: Math.floor(Math.random() * 3) + 1, // 1 ile 3 km arası
            progress: 0,
            reward: 100,
            description: 'Toplam {target} km koş',
            isClaimed: false
        },
        {
            id: 'q_time_' + Date.now(),
            type: 'TIME',
            target: (Math.floor(Math.random() * 2) + 1) * 10, // 10 veya 20 dakika
            progress: 0,
            reward: 150,
            description: 'Toplam {target} dakika koş',
            isClaimed: false
        },
        {
            id: 'q_score_' + Date.now(),
            type: 'SCORE',
            target: 250,
            progress: 0,
            reward: 200,
            description: 'Koşulardan {target} puan topla',
            isClaimed: false
        }
    ];
    
    // Görevlerin açıklamasındaki {target} kısmını sayıyla değiştir
    return quests.map(q => ({
        ...q,
        description: q.description.replace('{target}', q.target.toString())
    }));
};

// İlerlemeyi kontrol et ve güncelle
export const updateQuestProgress = (quests: Quest[], stats: { distance: number, time: number, score: number, conquests: number }): Quest[] => {
    return quests.map(quest => {
        if (quest.isClaimed) return quest;

        let newProgress = quest.progress;

        if (quest.type === 'DISTANCE') newProgress += stats.distance;
        else if (quest.type === 'TIME') newProgress += stats.time; // Dakika cinsinden
        else if (quest.type === 'SCORE') newProgress += stats.score;
        else if (quest.type === 'CONQUER') newProgress += stats.conquests;

        // İlerleme hedefi geçmemeli (görsel açıdan) ama mantıken geçmiş sayılır
        if (newProgress > quest.target) newProgress = quest.target;

        return { ...quest, progress: newProgress };
    });
};