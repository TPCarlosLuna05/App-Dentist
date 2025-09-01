import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function HistorialCitasDoctor() {
  const navigation = useNavigation();
  const route = useRoute();
  const { doctorId, doctorNombre } = route.params || {};
  
  const [citasCompletadas, setCitasCompletadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (doctorId) {
      fetchHistorialCitas(doctorId);
    } else {
      setLoading(false);
      Alert.alert('Error', 'No se proporcionaron datos del doctor');
      navigation.goBack();
    }
  }, [doctorId]);

  const fetchHistorialCitas = async (doctorId) => {
    try {
      setLoading(true);
      console.log(`Obteniendo historial de citas completadas para el doctor ID: ${doctorId}`);
      
      const response = await api.get(`/citas-completadas-doctor/${doctorId}`);
      console.log('Respuesta de historial de citas completadas:', response);
      
      // Verificamos si tenemos una respuesta exitosa con datos
      if (response && response.success) {
        // La estructura puede ser directamente un array o estar como propiedad 'data'
        const citasData = Array.isArray(response.data) ? response.data : 
                         (response.data?.citas || response.data || []);
        
        if (Array.isArray(citasData)) {
          setCitasCompletadas(citasData);
          console.log(`Se encontraron ${citasData.length} citas completadas/canceladas`);
        } else {
          console.error('El formato de datos no es un array:', citasData);
          setCitasCompletadas([]);
          Alert.alert('Formato incorrecto', 'Los datos recibidos no tienen el formato esperado');
        }
      } else {
        console.log('No se encontraron citas completadas para este doctor o hubo un error en la respuesta');
        setCitasCompletadas([]);
        
        // Si hay un mensaje de error específico, lo mostramos
        if (response && response.message) {
          Alert.alert('Información', response.message);
        }
      }
    } catch (error) {
      console.error('Error al obtener historial de citas:', error);
      Alert.alert('Error', 'No se pudo cargar el historial de citas');
      setCitasCompletadas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistorialCitas(doctorId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    
    const date = new Date(dateString);
    const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    };
    
    return date.toLocaleDateString('es-ES', options);
  };

  const renderCitaItem = ({ item }) => (
    <View style={styles.citaCard}>
      <View style={styles.citaCardHeader}>
        <Ionicons 
          name={item.estado?.toLowerCase() === 'completada' ? "checkmark-circle-outline" : "close-circle-outline"} 
          size={24} 
          color={item.estado?.toLowerCase() === 'completada' ? "#2FA0AD" : "#F44336"} 
        />
        <Text style={styles.citaDate}>{formatDate(item.fecha)}</Text>
        <Text style={styles.citaHora}>{item.hora?.substring(0, 5) || 'N/A'}</Text>
      </View>

      <View style={styles.citaCardBody}>
        <Text style={styles.pacienteNombre}>
          <Text style={styles.labelText}>Paciente:</Text> {item.paciente?.nombre} {item.paciente?.apellidos}
        </Text>
        
        <Text style={styles.citaDetalle}>
          <Text style={styles.labelText}>Procedimiento:</Text> {item.procedimiento?.nombre || item.descripcion_manual || 'No especificado'}
        </Text>
        
        {item.estado && (
          <View style={[
            styles.estadoContainer,
            { backgroundColor: getEstadoColor(item.estado) }
          ]}>
            <Text style={styles.estadoText}>{formatEstado(item.estado)}</Text>
          </View>
        )}
        
        {item.observaciones && (
          <Text style={styles.citaObservaciones}>
            <Text style={styles.labelText}>Notas:</Text> {item.observaciones}
          </Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.verDetallesButton}
        onPress={() => navigation.navigate('CitaDetails', { cita: item })}
      >
        <Text style={styles.verDetallesText}>Ver Detalles</Text>
      </TouchableOpacity>
    </View>
  );

  const getEstadoColor = (estado) => {
    switch (estado.toLowerCase()) {
      case 'completada': return 'rgba(76, 175, 80, 0.2)';
      case 'cancelada': return 'rgba(244, 67, 54, 0.2)';
      default: return 'rgba(158, 158, 158, 0.2)';
    }
  };

  const formatEstado = (estado) => {
    if (!estado) return 'No definido';
    
    const estados = {
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };
    
    return estados[estado.toLowerCase()] || estado;
  };

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
          <Text style={styles.headerTitle}>Historial de Citas</Text>
          <View style={{ width: 40 }}></View>
        </View>
      </LinearGradient>

      <View style={styles.doctorInfoContainer}>
        <Text style={styles.doctorName}>
          Dr(a). {doctorNombre || 'Doctor'}
        </Text>
        <Text style={styles.subtitleText}>
          Citas completadas y canceladas
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#21588E" />
          <Text style={styles.loadingText}>Cargando historial de citas...</Text>
        </View>
      ) : (
        <FlatList
          data={citasCompletadas}
          renderItem={renderCitaItem}
          keyExtractor={(item, index) => `cita-${item.id || index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#21588E', '#2FA0AD']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="checkmark-done-outline"
                size={60} 
                color="#cccccc" 
              />
              <Text style={styles.emptyText}>
                No hay citas completadas o canceladas
              </Text>
              <Text style={styles.emptySubtext}>
                El historial de citas completadas y canceladas aparecerá aquí
              </Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={styles.resultSummary}>
              {citasCompletadas.length} citas en historial
            </Text>
          }
        />
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
  doctorInfoContainer: {
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
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  listContainer: {
    padding: 15,
    paddingTop: 10,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
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
  resultSummary: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
  },
  citaCard: {
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
    borderLeftColor: '#2FA0AD',
  },
  citaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  citaDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  citaHora: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  citaCardBody: {
    paddingLeft: 34,
  },
  pacienteNombre: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  citaDetalle: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  citaObservaciones: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
  labelText: {
    fontWeight: 'bold',
    color: '#555',
  },
  estadoContainer: {
    alignSelf: 'flex-start',
    marginVertical: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  verDetallesButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  verDetallesText: {
    color: '#21588E',
    fontWeight: '500',
    fontSize: 14,
  }
});
