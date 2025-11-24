import { useState, useRef } from 'react';
import { Region } from 'react-native-maps';
import {
    collection, query, getDocs, where, Timestamp, FieldValue
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { geohashQueryBounds } from 'geofire-common';
import { Coordinate } from '../utils';

export interface ConqueredRoute {
    id: string;
    ownerId: string;
    coords: Coordinate[];
    distanceKm: number;
    gaspScore: number;
    claimedAt: Timestamp | FieldValue | undefined;
    durationSeconds?: number;
    geohash?: string;
}

export const useRouteFetcher = () => {
    const [conqueredRoutes, setConqueredRoutes] = useState<ConqueredRoute[]>([]);
    const [isFetchingRoutes, setIsFetchingRoutes] = useState(false);
    const loadedGeohashes = useRef<Set<string>>(new Set());

    const loadRoutesForRegion = async (region: Region) => {
        if (isFetchingRoutes) return;
        setIsFetchingRoutes(true);

        const center: Coordinate = {
            latitude: region.latitude,
            longitude: region.longitude
        };
        const radiusInM = (region.latitudeDelta * 111320) / 2;

        const bounds = geohashQueryBounds([center.latitude, center.longitude], radiusInM);
        const newGeohashesToLoad: string[] = [];

        for (const b of bounds) {
            const geohash = b.join();
            if (!loadedGeohashes.current.has(geohash)) {
                newGeohashesToLoad.push(geohash);
                loadedGeohashes.current.add(geohash);
            }
        }

        if (newGeohashesToLoad.length === 0) {
            setIsFetchingRoutes(false);
            return;
        }

        try {
            const queries = newGeohashesToLoad.map(hashRange => {
                return query(
                    collection(db, "routes"),
                    where("geohash", ">=", hashRange[0]),
                    where("geohash", "<=", hashRange[1])
                );
            });

            const snapshots = await Promise.all(queries.map(q => getDocs(q)));
            const newRoutes: ConqueredRoute[] = [];

            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const routeCoords: Coordinate[] = (data.coords || []).map((gp: any) => ({
                        latitude: gp.latitude,
                        longitude: gp.longitude
                    }));

                    newRoutes.push({
                        id: doc.id,
                        ownerId: data.ownerId || data.userId,
                        coords: routeCoords,
                        distanceKm: data.distanceKm || 0,
                        gaspScore: data.gaspScore || 0,
                        claimedAt: data.claimedAt,
                        durationSeconds: data.durationSeconds,
                        geohash: data.geohash
                    });
                });
            });

            if (newRoutes.length > 0) {
                setConqueredRoutes(prevRoutes => {
                    const existingIds = new Set(prevRoutes.map(r => r.id));
                    const filteredNewRoutes = newRoutes.filter(r => !existingIds.has(r.id));
                    return [...prevRoutes, ...filteredNewRoutes];
                });
            }
        } catch (error) {
            console.error("Rotalar çekilirken hata: ", error);
            // Remove failed geohashes so we can try again
            newGeohashesToLoad.forEach(hash => loadedGeohashes.current.delete(hash));
        } finally {
            setIsFetchingRoutes(false);
        }
    };

    return {
        conqueredRoutes,
        setConqueredRoutes,
        isFetchingRoutes,
        loadRoutesForRegion
    };
};
