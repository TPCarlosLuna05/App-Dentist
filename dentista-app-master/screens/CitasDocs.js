import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function CitasDocs() {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorId, setDoctorId] = useState(null);
  const [doctorData, setDoctorData] = useState(null);
  const [filteredCitas, setFilteredCitas] = useState([]);
  const navigation = useNavigation();

  // Cargar el ID del doctor desde AsyncStorage al iniciar
  useEffect(() => {
    const loadDoctorData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          console.log('Datos de usuario:', user);
          
          // Verificar todas las posibles ubicaciones del ID del doctor
          let doctorIdentifier = null;
          
          // 1. Primero verificar si hay un doctor_id específico
          if (user.doctor_id) {
            doctorIdentifier = user.doctor_id;
          }
          // 2. Si el usuario es un doctor, usar su propio ID
          else if (user.id && (user.tipo === 'doctor' || user.rol === 'doctor')) {
            doctorIdentifier = user.id;
          }
          // 3. Si hay datos de doctor anidados, usar ese ID
          else if (user.doctor && user.doctor.id) {
            doctorIdentifier = user.doctor.id;
          }
          // 4. Como último recurso, usar el ID del usuario
          else if (user.id) {
            doctorIdentifier = user.id;
          }

          if (doctorIdentifier) {
            console.log('ID del doctor identificado:', doctorIdentifier);
            setDoctorId(doctorIdentifier);
            await fetchDoctorInfo(doctorIdentifier);
          } else {
            console.error('No se pudo determinar el ID del doctor');
            Alert.alert(
              'Error de identificación',
              'No se pudo identificar al doctor. Por favor, inicia sesión nuevamente.',
              [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
          }
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        Alert.alert('Error', 'No se pudo obtener la información del usuario');
      }
    };

    loadDoctorData();
  }, []);

  // Obtener información del doctor
  const fetchDoctorInfo = async (id) => {
    try {
      const response = await api.get(`/doctores/${id}`);
      console.log('Información del doctor:', response);
      
      if (response.success) {
        setDoctorData(response.data);
      } else if (response.message === 'Doctor no encontrado') {
        console.error('El doctor especificado no existe');
        Alert.alert(
          'Doctor no encontrado',
          'No se pudo obtener la información del doctor. Es posible que haya sido eliminado.',
          [{ 
            text: 'Volver', 
            onPress: () => navigation.navigate('Home')
          }]
        );
      } else {
        console.error('Error al obtener información del doctor:', response);
        Alert.alert('Error', response.message || 'No se pudo obtener la información del doctor');
      }
    } catch (error) {
      console.error('Error al obtener información del doctor:', error);
    }
  };

  // Cargar citas cuando tengamos el ID del doctor
  useFocusEffect(
    React.useCallback(() => {
      if (doctorId) {
        fetchCitas();
      }
    }, [doctorId])
  );
  // Función para cargar citas del doctor
  const fetchCitas = async () => {
    const doctorIdentifier = doctorId;
    if (!doctorIdentifier) {
      console.error('ID del doctor no disponible');
      Alert.alert(
        'Error',
        'No se pudo identificar al doctor. Por favor, inicie sesión nuevamente.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
      return;
    }
    
    setLoading(true);
    try {
      // Usar el endpoint correcto para obtener las citas pendientes del doctor
      console.log(`Obteniendo citas para el doctor ID: ${doctorId} usando citas-por-doctor`);
      const response = await api.get(`/citas-por-doctor/${doctorIdentifier}`);
      
      console.log('Respuesta recibida de citas por doctor');
      
      // Identificar dónde está el array de citas de manera segura
      let citasArray = [];
      
      // Estructura típica de respuesta para /citas-por-servicio
      if (response && response.success && Array.isArray(response.data)) {
        citasArray = response.data;
      } 
      // Por si la API devuelve los datos dentro de data.data
      else if (response && response.success && response.data && Array.isArray(response.data.data)) {
        citasArray = response.data.data;
      }
      // Otras estructuras posibles
      else if (Array.isArray(response)) {
        citasArray = response;
      }
      
      // Filtrar las citas de forma segura para mostrar sólo pendientes y por confirmar
      const citasFiltradas = citasArray.filter(cita => {
        if (!cita || typeof cita.estado !== 'string') return false;
        
        const estado = cita.estado.toLowerCase();
        return estado === 'pendiente' || estado === 'por confirmar';
      });
      
      console.log(`Citas filtradas (pendientes/por confirmar): ${citasFiltradas.length}`);
      setCitas(citasFiltradas);
      setFilteredCitas(citasFiltradas);
    } catch (error) {
      console.error('Error obteniendo citas del doctor:', error);
      Alert.alert('Error', 'Hubo un problema al cargar las citas del doctor.');
      setCitas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchCitas();
  };
  // Filtrar citas por búsqueda cada vez que cambie la búsqueda o las citas
  useEffect(() => {
    if (!citas.length) {
      setFilteredCitas([]);
      return;
    }
    
    const filtered = citas.filter(cita => {
      const searchLower = searchQuery.toLowerCase();
      // Buscar por nombre de paciente, fecha o estado
      return (
        cita.paciente?.nombre?.toLowerCase().includes(searchLower) || 
        cita.paciente?.apellidos?.toLowerCase().includes(searchLower) ||
        cita.fecha?.toLowerCase().includes(searchLower) ||
        cita.estado?.toLowerCase().includes(searchLower) ||
        (cita.procedimiento?.nombre || cita.descripcion_manual || '')
          .toLowerCase().includes(searchLower)
      );
    });
    
    setFilteredCitas(filtered);
  }, [citas, searchQuery]);

  // Función para eliminar cita
  const handleDeleteCita = (citaId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Está seguro de que desea eliminar esta cita?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.delete(`/citas/${citaId}`);
              console.log('Respuesta eliminación:', response);
              
              if (response.success) {
                Alert.alert('Éxito', 'Cita eliminada correctamente');
                fetchCitas();
              } else {
                Alert.alert('Error', 'No se pudo eliminar la cita');
                setLoading(false);
              }
            } catch (error) {
              console.error('Error al eliminar cita:', error);
              Alert.alert('Error', 'Ocurrió un problema al eliminar la cita');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Obtener color según el estado de la cita
  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return '#FF9800'; // Naranja
      case 'por confirmar': return '#2196F3'; // Azul
      case 'completada': return '#4CAF50'; // Verde
      case 'cancelada': return '#F44336'; // Rojo
      default: return '#757575'; // Gris
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Formatear hora para mostrar
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // Si ya tiene el formato HH:MM:SS
    if (typeof timeString === 'string' && timeString.includes(':')) {
      return timeString.substring(0, 5); // Devuelve solo HH:MM
    }
    
    return '';
  };

  // Renderizar cada ítem de cita
  const renderCitaItem = ({ item }) => (
    <TouchableOpacity
      style={styles.citaCard}
      onPress={() => navigation.navigate('CitaDetails', { citaId: item.id })}
    >
      <View style={styles.citaCardHeader}>
        <View style={styles.citaInfo}>
          <Text style={styles.pacienteName}>
            {item.paciente ? `${item.paciente.nombre} ${item.paciente.apellidos || ''}` : 'Paciente no especificado'}
          </Text>
          
          <Text style={styles.citaFecha}>
            <Ionicons name="calendar-outline" size={14} color="#666" /> {formatDate(item.fecha)}
            {item.hora ? ` - ${formatTime(item.hora)}` : ''}
          </Text>
          
          <Text style={styles.citaProcedimiento}>
            {item.procedimiento ? item.procedimiento.nombre : item.descripcion_manual || 'Sin procedimiento'}
          </Text>
        </View>
        
        <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
          <Text style={styles.estadoText}>{item.estado || 'Pendiente'}</Text>
        </View>
      </View>
      
      <View style={styles.citaActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CitaDetails', { citaId: item.id })}
        >
          <Ionicons name="eye-outline" size={18} color="#21588E" />
          <Text style={styles.actionText}>Ver</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CitaForm', { cita: item, isEditing: true })}
        >
          <Ionicons name="create-outline" size={18} color="#4CAF50" />
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteCita(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#F44336" />
          <Text style={styles.actionText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Mostrar mensaje cuando no hay datos
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      {searchQuery ? (
        <>
          <Ionicons name="search" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No se encontraron citas que coincidan con "{searchQuery}"</Text>
        </>
      ) : (
        <>
          <Ionicons name="calendar-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No hay citas programadas</Text>
          <Text style={styles.emptySubText}>
            Las citas que programes aparecerán aquí
          </Text>
        </>
      )}
    </View>
  );

  // Si no hay ID de doctor, mostrar mensaje de error
  if (!doctorId && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#F44336" />
        <Text style={styles.errorText}>No se pudo identificar al doctor</Text>
        <Text style={styles.errorSubText}>
          Es posible que no tengas permisos para acceder a esta sección
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backButtonText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Citas</Text>
        <View style={{ width: 40 }} />
      </View>

      {doctorData && (
        <View style={styles.doctorInfoContainer}>
          <Text style={styles.doctorName}>Dr. {doctorData.nombre}</Text>
          {doctorData.especialidad && (
            <Text style={styles.doctorSpecialty}>{doctorData.especialidad}</Text>
          )}
        </View>
      )}

      <View style={styles.estadosInfo}>
        <Text style={styles.estadosTitle}>Mostrando citas pendientes y por confirmar</Text>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar citas..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Lista de citas */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#21588E" />
          <Text style={styles.loadingText}>Cargando citas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCitas}
          keyExtractor={item => item.id.toString()}
          renderItem={renderCitaItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#21588E']}
            />
          }
        />
      )}

      {/* Botón para crear nueva cita */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => navigation.navigate('CitaForm', { doctorPreseleccionado: doctorId })}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 120,
    backgroundColor: '#21588E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  estadosInfo: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 10,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  estadosTitle: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 5,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 80, // Espacio para el FAB
  },
  citaCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  citaCardHeader: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  citaInfo: {
    flex: 1,
  },
  pacienteName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  citaFecha: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  citaProcedimiento: {
    fontSize: 14,
    color: '#21588E',
    fontWeight: '500',
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginLeft: 10,
  },
  estadoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  citaActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  actionText: {
    fontSize: 14,
    marginLeft: 5,
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
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  errorSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#21588E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
