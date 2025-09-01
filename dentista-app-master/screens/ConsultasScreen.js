import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function ConsultasScreen() {
  const navigation = useNavigation();
  const [citas, setCitas] = useState([]);
  const [filteredCitas, setFilteredCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorId, setDoctorId] = useState(null);
  const [doctorName, setDoctorName] = useState('');
  // Cargar el ID y nombre del doctor al iniciar
  useEffect(() => {
    const loadDoctorInfo = async () => {
      try {
        const storedDoctorId = await AsyncStorage.getItem('doctorId');
        const storedDoctorName = await AsyncStorage.getItem('doctorName');
        
        // Si no hay ID de doctor almacenado, intentamos obtenerlo de userData
        if (!storedDoctorId) {
          console.log('No se encontró ID del doctor en AsyncStorage, buscando en userData...');
          const userDataStr = await AsyncStorage.getItem('userData');
          
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            const doctorId = userData.doctor?.id || userData.doctor_id || userData.id;
            
            if (doctorId) {
              console.log('ID del doctor encontrado en userData:', doctorId);
              setDoctorId(doctorId.toString());
              
              // También lo guardamos para futuras consultas
              await AsyncStorage.setItem('doctorId', doctorId.toString());
              
              // Si tenemos el nombre también lo guardamos
              if (userData.doctor?.nombre || userData.nombre) {
                const nombreDoctor = userData.doctor?.nombre || userData.nombre;
                await AsyncStorage.setItem('doctorName', nombreDoctor);
                setDoctorName(nombreDoctor);
              }
              
              return;
            }
          }
          
          console.warn('No se pudo encontrar el ID del doctor');
          Alert.alert(
            'Atención',
            'No se ha podido identificar el doctor. Por favor, cierre la sesión e ingrese nuevamente.',
            [{ text: 'OK' }]
          );
        } else {
          setDoctorId(storedDoctorId);
          console.log('ID del doctor cargado:', storedDoctorId);
        }

        if (storedDoctorName) {
          setDoctorName(storedDoctorName);
        }
      } catch (error) {
        console.error('Error al cargar información del doctor:', error);
        Alert.alert('Error', 'Hubo un problema al cargar la información del doctor.');
      }
    };

    loadDoctorInfo();
  }, []);
  // Cargar las citas cuando la pantalla obtiene el foco o cambia el doctorId
  useFocusEffect(
    React.useCallback(() => {
      if (doctorId) {
        fetchCitasByDoctor();
      }
    }, [doctorId])
  );
  
  // Función para refrescar las citas (para pull-to-refresh)
  const onRefresh = React.useCallback(async () => {
    if (!doctorId) return;
    setRefreshing(true);
    try {
      await fetchCitasByDoctor();
    } catch (error) {
      console.error('Error al refrescar citas:', error);
    } finally {
      setRefreshing(false);
    }
  }, [doctorId]);
  // Función para obtener las citas del doctor desde la API
  const fetchCitasByDoctor = async () => {
    if (!doctorId) {
      console.log('No hay ID de doctor disponible');
      setLoading(false);
      Alert.alert('Error', 'No se pudo identificar el doctor. Por favor cierre sesión e ingrese nuevamente.');
      return;
    }

    setLoading(true);
    try {
      // Verificamos que el doctorId es un número o cadena de texto válida
      const doctorIdNumber = parseInt(doctorId);
      if (isNaN(doctorIdNumber)) {
        console.error(`El ID del doctor (${doctorId}) no es un número válido`);
        Alert.alert('Error', 'ID de doctor no válido. Por favor cierre sesión e ingrese nuevamente.');
        setLoading(false);
        return;
      }
      
      // Obtenemos todas las citas si es un administrador, o solo las del doctor específico si es un doctor
      let response;
      const userDataStr = await AsyncStorage.getItem('userData');
      const userData = JSON.parse(userDataStr || '{}');
      const isAdmin = userData.rol === 'admin' || userData.is_admin === 1;
      
      if (isAdmin) {
        console.log('Usuario administrador: obteniendo todas las citas');
        response = await api.get('/citas');
      } else {
        console.log(`Usuario doctor: obteniendo citas específicas para doctor ID: ${doctorIdNumber}`);
        response = await api.getCitasByDoctor(doctorIdNumber);
      }

      console.log('Respuesta de citas del doctor:', JSON.stringify(response));

      let citasParaFiltrar = [];
      if (response.success) {
        // Nos aseguramos de que response.data siempre sea un array
        if (!response.data) {
          console.log('response.data es undefined o null, usando array vacío');
          citasParaFiltrar = [];
        } else if (Array.isArray(response.data)) {
          citasParaFiltrar = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          citasParaFiltrar = response.data.data;
        } else {
          console.log('La respuesta.data no contiene un array de citas válido:', JSON.stringify(response.data));
          setCitas([]);
          setFilteredCitas([]);
          Alert.alert('Error al cargar citas', 'No se encontraron citas para mostrar.');
          return;
        }

        console.log(`Encontradas ${citasParaFiltrar.length} citas antes de filtrar`);

        // Verificamos que las citas tienen la estructura esperada
        if (citasParaFiltrar.length > 0) {
          console.log('Ejemplo de cita recibida:', JSON.stringify(citasParaFiltrar[0]));
        }        // Nos aseguramos que citasParaFiltrar sea un array antes de usar filter
        const citasFiltradas = Array.isArray(citasParaFiltrar) ? citasParaFiltrar.filter(cita => {
          if (!cita || typeof cita !== 'object') {
            console.log('Cita inválida encontrada:', cita);
            return false;
          }
          
          if (!cita.estado) {
            console.log('Cita sin estado encontrada:', cita);
            return false;
          }
          
          const estado = cita.estado.toLowerCase();
          return estado === 'pendiente' || estado === 'por confirmar';
        }) : [];

        setCitas(citasFiltradas);
        setFilteredCitas(citasFiltradas);
        console.log(`Se encontraron ${citasFiltradas.length} citas para el doctor`);
      } else {
        console.log('No se encontraron citas válidas o la respuesta no es exitosa:', JSON.stringify(response));
        setCitas([]);
        setFilteredCitas([]);
        if (response && response.message) {
          Alert.alert('Error al cargar citas', response.message);
        } else {
          Alert.alert('Error al cargar citas', 'Hubo un problema al obtener las citas.');
        }
      }
    } catch (error) {
      console.error('Error obteniendo citas del doctor:', error);
      console.error('Mensaje:', error.message);
      if (error.response) {
        console.error('Respuesta del error:', error.response.data);
      }
      Alert.alert('Error', 'Ocurrió un error al comunicarse con el servidor.');
      setCitas([]);
      setFilteredCitas([]);
    } finally {
      setLoading(false);
    }
  };
  // Filtrado de citas por búsqueda
  useEffect(() => {
    // Verificar que citas sea un array antes de intentar filtrar
    if (!Array.isArray(citas)) {
      console.log('citas no es un array en el filtrado de búsqueda');
      setFilteredCitas([]);
      return;
    }
    
    if (searchQuery.trim() === '') {
      setFilteredCitas(citas);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = citas.filter(cita =>
        (cita.paciente?.nombre?.toLowerCase().includes(query) ||
          cita.paciente?.apellidos?.toLowerCase().includes(query) ||
          cita.procedimiento?.nombre?.toLowerCase().includes(query) ||
          cita.descripcion_manual?.toLowerCase().includes(query) ||
          (Array.isArray(cita.serviciosDirectos) && cita.serviciosDirectos.some(servicio =>
            servicio.nombre?.toLowerCase().includes(query)
          )) ||
          cita.fecha?.includes(query))
      );
      setFilteredCitas(filtered);
    }
  }, [searchQuery, citas]);

  // Función para eliminar una cita
  const handleDeleteCita = (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar esta cita?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.delete(`/citas/${id}`);

              if (response.success || response.status === 'success') {
                setCitas(prevCitas => prevCitas.filter(cita => cita.id !== id));
                Alert.alert('Éxito', 'Cita eliminada correctamente');
              } else {
                Alert.alert('Error', 'No se pudo eliminar la cita');
              }
            } catch (error) {
              console.error('Error al eliminar cita:', error);
              Alert.alert('Error', 'Ocurrió un problema al eliminar la cita');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Navegar al formulario de nueva cita
  const handleAddCita = () => {
    navigation.navigate('CitaForm', { doctorId });
  };

  // Navegar al formulario de edición de cita
  const handleEditCita = (cita) => {
    navigation.navigate('CitaForm', { cita, isEditing: true });
  };

  // Navegar a los detalles de la cita
  const handleViewCita = (cita) => {
    navigation.navigate('CitaDetails', { citaId: cita.id });
  };

  // Función para obtener el color según el estado de la cita
  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return '#FF9800'; // Naranja
      case 'por confirmar': return '#2196F3'; // Azul
      case 'completada': return '#4CAF50'; // Verde
      case 'cancelada': return '#F44336'; // Rojo
      default: return '#757575'; // Gris
    }
  };

  // Función para formatear la fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';

    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  };

  // Función para formatear la hora
  const formatTime = (timeString) => {
    if (!timeString) return 'Sin hora';

    if (timeString.includes(':')) {
      return timeString.substring(0, 5);
    }

    const date = new Date(timeString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  // Función para mostrar servicios
  const renderServiciosInfo = (cita) => {
    if (!cita.serviciosDirectos || cita.serviciosDirectos.length === 0) {
      return null;
    }

    let total = 0;
    cita.serviciosDirectos.forEach(servicio => {
      const cantidad = servicio.pivot ? servicio.pivot.cantidad : 1;
      const precio = servicio.pivot ? servicio.pivot.precio_unitario : servicio.precio;
      total += cantidad * precio;
    });

    return (
      <View style={styles.serviciosContainer}>
        <Text style={styles.serviciosTitle}>Servicios:</Text>
        {cita.serviciosDirectos.map((servicio, index) => (
          <Text key={index} style={styles.servicioText}>
            {servicio.nombre} - {servicio.pivot?.cantidad || 1}x ${servicio.pivot?.precio_unitario || servicio.precio}
          </Text>
        ))}
        <Text style={styles.totalText}>Total: ${total.toFixed(2)}</Text>
      </View>
    );
  };

  // Renderizado de cada item de cita
  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.citaCard}
        onPress={() => handleViewCita(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.citaFecha}>{formatDate(item.fecha)}</Text>
            <Text style={styles.citaHora}>{formatTime(item.hora)}</Text>
          </View>
          <View style={[styles.estadoContainer, { backgroundColor: getEstadoColor(item.estado) }]}>
            <Text style={styles.estadoText}>{item.estado || 'Sin estado'}</Text>
          </View>
        </View>
        
        <Text style={styles.patientName}>
          {item.paciente ? `${item.paciente.nombre} ${item.paciente.apellidos}` : 'Paciente no asignado'}
        </Text>
        
        {item.procedimiento && (
          <Text style={styles.procedimientoText}>
            {item.procedimiento.nombre}
          </Text>
        )}
        
        {item.descripcion_manual && (
          <Text style={styles.descripcionText}>
            {item.descripcion_manual}
          </Text>
        )}
        
        {renderServiciosInfo(item)}
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditCita(item)}
          >
            <Ionicons name="create-outline" size={22} color="#2196F3" />
            <Text style={[styles.actionText, { color: '#2196F3' }]}>Editar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteCita(item.id)}
          >
            <Ionicons name="trash-outline" size={22} color="#F44336" />
            <Text style={[styles.actionText, { color: '#F44336' }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );  };
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#21588E', '#2FA0AD']}
        style={styles.header}
      >
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Consultas</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={loading || refreshing}
          >
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#FFFFFF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cita..."
            placeholderTextColor="#CCCCCC"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#21588E" />
          <Text style={styles.loadingText}>Cargando consultas...</Text>
        </View>
      ) : filteredCitas.length > 0 ? (
        <FlatList
          data={filteredCitas}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#21588E', '#2FA0AD']}
              tintColor="#21588E"
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={80} color="#CCCCCC" />
          <Text style={styles.emptyText}>No hay citas disponibles</Text>
          <Text style={styles.emptySubtext}>Las citas programadas aparecerán aquí</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddCita}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  citaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  citaFecha: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  citaHora: {
    fontSize: 16,
    marginLeft: 10,
    color: '#666',
    fontWeight: '500',
  },
  estadoContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  estadoText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 12,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#21588E',
    marginBottom: 8,
  },
  procedimientoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  descripcionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  serviciosContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  serviciosTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  servicioText: {
    fontSize: 13,
    color: '#666',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#21588E',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    marginLeft: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#21588E',
    right: 20,
    bottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
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
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  }
});
