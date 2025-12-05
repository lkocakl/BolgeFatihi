import { Quest } from './AuthContext';

export const QUEST_TYPES = {
    DISTANCE: 'DISTANCE',
    TIME: 'TIME',
    SCORE: 'SCORE',
    CONQUER: 'CONQUER'
};

export const generateDailyQuests = (): Quest[] => {
    // ID çakışmasını önlemek için random ekliyoruz
    const uniqueId = () => Math.random().toString(36).substr(2, 9);

    const quests: Quest[] = [
        {
            id: `q_dist_${Date.now()}_${uniqueId()}`,
            type: 'DISTANCE',
            target: Math.floor(Math.random() * 3) + 1,
            progress: 0,
            reward: 100,
            descriptionKey: 'quests.distance', // Çeviri anahtarı
            descriptionParams: { target: 0 }, // Parametre (aşağıda güncelleniyor)
            isClaimed: false
        },
        {
            id: `q_time_${Date.now()}_${uniqueId()}`,
            type: 'TIME',
            target: (Math.floor(Math.random() * 2) + 1) * 10,
            progress: 0,
            reward: 150,
            descriptionKey: 'quests.time',
            descriptionParams: { target: 0 },
            isClaimed: false
        },
        {
            id: `q_score_${Date.now()}_${uniqueId()}`,
            type: 'SCORE',
            target: 250,
            progress: 0,
            reward: 200,
            descriptionKey: 'quests.score',
            descriptionParams: { target: 0 },
            isClaimed: false
        }
    ];

    // Target değerlerini params içine ata
    return quests.map(q => ({
        ...q,
        descriptionParams: { target: q.target }
    }));
};

export const updateQuestProgress = (quests: Quest[], stats: { distance: number, time: number, score: number, conquests: number }): Quest[] => {
    return quests.map(quest => {
        if (quest.isClaimed) return quest;

        let newProgress = quest.progress;

        if (quest.type === 'DISTANCE') newProgress += stats.distance;
        else if (quest.type === 'TIME') newProgress += stats.time;
        else if (quest.type === 'SCORE') newProgress += stats.score;
        else if (quest.type === 'CONQUER') newProgress += stats.conquests;

        if (newProgress > quest.target) newProgress = quest.target;

        return { ...quest, progress: newProgress };
    });
};  