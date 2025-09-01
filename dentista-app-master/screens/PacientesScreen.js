import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export default function PacientesScreen() {
  const navigation = useNavigation();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      checkConnectivity();
      loadPatients();
      
      const unsubscribe = NetInfo.addEventListener(state => {
        setIsConnected(state.isConnected);
        if (state.isConnected) {
          syncOfflineData();
        }
      });
      
      return () => unsubscribe();
    }, [])
  );

  const checkConnectivity = async () => {
    const connectionInfo = await NetInfo.fetch();
    setIsConnected(connectionInfo.isConnected);
  };

  const loadPatients = async () => {
    setIsLoading(true);
    
    if (isConnected) {
      // Si hay conexión, intentar cargar desde API
      try {
        const response = await axios.get('https://dentist-app-0fcf42a43c96.herokuapp.com/api/pacientes');
        
        if (response.data && Array.isArray(response.data)) {
          setPatients(response.data);
          setFilteredPatients(response.data);
          
          // Guardar localmente para acceso sin conexión
          await AsyncStorage.setItem('localPacientes', JSON.stringify(response.data));
        }
      } catch (error) {
        console.error('Error al cargar pacientes:', error);
        loadOfflinePatients();
      }
    } else {
      // Sin conexión, cargar datos locales
      loadOfflinePatients();
    }
    
    setIsLoading(false);
    setRefreshing(false);
  };
  
  const loadOfflinePatients = async () => {
    try {
      const localData = await AsyncStorage.getItem('localPacientes');
      if (localData) {
        const localPatients = JSON.parse(localData);
        setPatients(localPatients);
        setFilteredPatients(localPatients);
      }
    } catch (error) {
      console.error('Error al cargar pacientes locales:', error);
    }
  };

  const syncOfflineData = async () => {
    try {
      const offlineDataJson = await AsyncStorage.getItem('offlinePacientes');
      if (!offlineDataJson) return;
      
      const offlineQueue = JSON.parse(offlineDataJson);
      if (offlineQueue.length === 0) return;
      
      let syncedCount = 0;
      let failedCount = 0;
      
      // Procesar cada entrada pendiente
      for (const item of offlineQueue) {
        if (item.isSync) continue;
        
        try {
          await axios({
            method: item.method,
            url: item.url,
            data: item.data,
            headers: item.method === 'put' ? {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-HTTP-Method-Override': 'PUT'
            } : undefined
          });
          
          // Marcar como sincronizado
          item.isSync = true;
          syncedCount++;
        } catch (error) {
          console.error('Error al sincronizar elemento:', error);
          failedCount++;
        }
      }
      
      // Guardar el estado actualizado
      const updatedQueue = offlineQueue.filter(item => !item.isSync);
      await AsyncStorage.setItem('offlinePacientes', JSON.stringify(updatedQueue));
      
      // Refrescar la lista después de sincronizar
      if (syncedCount > 0) {
        loadPatients();
        Alert.alert(
          'Sincronización completada',
          `Se han sincronizado ${syncedCount} registros. ${failedCount > 0 ? `${failedCount} registros fallaron.` : ''}`
        );
      }
    } catch (error) {
      console.error('Error en sincronización:', error);
    }
  };

  // ... resto del código existente ...
}

// ... resto de los estilos existentes ...
