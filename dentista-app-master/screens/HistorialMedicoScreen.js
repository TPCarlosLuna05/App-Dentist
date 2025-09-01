import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function HistorialMedicoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { paciente } = route.params || {};
  
  const [historialMedico, setHistorialMedico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (paciente && paciente.id) {
      fetchHistorialMedico(paciente.id);
    } else {
      setLoading(false);
      Alert.alert('Error', 'No se proporcionaron datos del paciente');
      navigation.goBack();
    }
  }, [paciente]);

  const fetchHistorialMedico = async (pacienteId) => {
    try {
      setLoading(true);
      console.log(`Obteniendo historial médico para el paciente ID: ${pacienteId}`);
      
      const response = await api.get(`/historial-por-paciente/${pacienteId}`);
      console.log('Respuesta de historial médico:', response);
      
      if (response.success && response.data?.historial) {
        console.log(`Se encontraron ${response.data.historial.length} registros en el historial`);
        setHistorialMedico(response.data.historial);
      } else {
        console.log('No se encontró historial médico para este paciente');
        setHistorialMedico([]);
      }
    } catch (error) {
      console.error('Error al obtener historial médico:', error);
      Alert.alert('Error', 'No se pudo cargar el historial médico');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    
    const date = new Date(dateString);
    const options = { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    return date.toLocaleDateString('es-ES', options);
  };

  const renderHistorialItem = ({ item }) => (
    <View style={styles.historialCard}>
      <View style={styles.historialCardHeader}>
        <Ionicons name="calendar" size={22} color="#21588E" />
        <Text style={styles.historialDate}>{formatDate(item.fecha)}</Text>
      </View>

      <View style={styles.historialCardBody}>
        <View style={styles.historialDetailItem}>
          <Text style={styles.historialDetailLabel}>Procedimiento:</Text>
          <Text style={styles.historialDetailValue}>{item.procedimiento}</Text>
        </View>
        
        <View style={styles.historialDetailItem}>
          <Text style={styles.historialDetailLabel}>Doctor:</Text>
          <Text style={styles.historialDetailValue}>{item.doctor}</Text>
        </View>
        
        {item.notas && (
          <View style={styles.historialDetailItem}>
            <Text style={styles.historialDetailLabel}>Notas:</Text>
            <Text style={styles.historialDetailValue}>{item.notas}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#21588E', '#2FA0AD']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial Médico</Text>
          <View style={{ width: 40 }}></View>
        </View>
      </LinearGradient>

      <View style={styles.patientInfoContainer}>
        <Text style={styles.patientName}>
          {paciente?.nombre} {paciente?.apellidos}
        </Text>
        {paciente?.telefono && (
          <Text style={styles.patientInfo}>Tel: {paciente.telefono}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#21588E" />
          <Text style={styles.loadingText}>Cargando historial médico...</Text>
        </View>
      ) : historialMedico.length > 0 ? (
        <FlatList
          data={historialMedico}
          renderItem={renderHistorialItem}
          keyExtractor={(item, index) => `historial-${index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultSummary}>
              {historialMedico.length} {historialMedico.length === 1 ? 'registro encontrado' : 'registros encontrados'}
            </Text>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color="#cccccc" />
          <Text style={styles.emptyText}>No hay historial médico disponible</Text>
          <Text style={styles.emptySubtext}>
            Cuando el paciente complete citas o procedimientos, aparecerán en esta sección.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    height: 120,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  patientInfoContainer: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  patientInfo: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 15,
    paddingTop: 5,
  },
  resultSummary: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
  },
  historialCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#21588E',
  },
  historialCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  historialDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  historialCardBody: {
    marginLeft: 34,
  },
  historialDetailItem: {
    marginBottom: 12,
  },
  historialDetailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 4,
  },
  historialDetailValue: {
    fontSize: 15,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
  },
});
