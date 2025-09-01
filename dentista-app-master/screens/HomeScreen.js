import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const userData = route.params?.userData || {};
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [proximasCitas, setProximasCitas] = useState([]);

  // Cargar próximas citas cuando la pantalla obtiene el foco
  useFocusEffect(
    React.useCallback(() => {
      cargarProximasCitas();
    }, [])
  );
  const cargarProximasCitas = async () => {
    try {
      setLoading(true);
      const doctorId = userData.doctor?.id || userData.id;
      
      if (!doctorId) {
        console.error('No se pudo identificar el ID del doctor');
        return;
      }

      // Usamos la ruta correcta para obtener citas por doctor
      const response = await api.get(`/citas-por-doctor/${doctorId}`);
      
      if (response.success) {
        // Filtrar solo las citas pendientes y ordenarlas por fecha y hora
        const citasPendientes = response.data
          .filter(cita => cita.estado === 'pendiente')
          .sort((a, b) => {
            const dateA = new Date(a.fecha + 'T' + a.hora);
            const dateB = new Date(b.fecha + 'T' + b.hora);
            return dateA - dateB;
          })
          .slice(0, 5); // Mostrar solo las próximas 5 citas

        setProximasCitas(citasPendientes);
      } else {
        console.error('Error al cargar las citas:', response);
      }
    } catch (error) {
      console.error('Error al cargar las citas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatearHora = (hora) => {
    if (!hora) return '';
    return hora.substring(0, 5); // Formato HH:MM
  };

  const services = [
    { id: 1, name: 'Agenda', icon: 'calendar' },
    { id: 6, name: 'CitasDoc', icon: 'clipboard' },
    { id: 3, name: 'Pacientes', icon: 'people' },
    { id: 2, name: 'Historial', icon: 'time' },
    { id: 7, name: 'Servicios', icon: 'cash' }
  ];

  const filteredServices = useMemo(() => {
    return services.filter(service =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const handleServicePress = (serviceName) => {
    if (serviceName === 'Agenda') {
      navigation.navigate('Calendar');
    }
    if (serviceName === 'CitasDoc') {
      navigation.navigate('CitasDocs');
    }
    if (serviceName === 'Pacientes') {
      navigation.navigate('Patients');
    }
    if (serviceName === 'Historial') {
      // Navegar a la nueva pantalla de historial de citas del doctor
      navigation.navigate('HistorialCitasDoctor', { 
        doctorId: userData.doctor?.id || userData.id, 
        doctorNombre: userData.doctor?.nombre || userData.usuario
      });
    }
    if (serviceName === 'Servicios') {
      navigation.navigate('Servicios');
    }
  };

  const handleLogout = () => {
    navigation.replace('Login');
  };

  const renderProximasCitas = () => (
    <View style={styles.appointmentsContainer}>
      <Text style={styles.appointmentsTitle}>Próximas Citas</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#21588E" />
      ) : proximasCitas.length > 0 ? (
        <FlatList
          data={proximasCitas}
          keyExtractor={(item) => item.id.toString()}
          style={styles.appointmentsList}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={210} // width + marginRight
          pagingEnabled={false}
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              style={[
                styles.appointmentCard,
                { 
                  borderColor: index % 2 === 0 ? '#21588E' : '#2FA0AD',
                  backgroundColor: index % 2 === 0 ? '#21588E' : '#2FA0AD'
                }
              ]}
              onPress={() => navigation.navigate('CitaDetails', { citaId: item.id })}
            >
              <Text style={[styles.patientName, { color: 'white' }]}>
                {item.paciente?.nombre} {item.paciente?.apellidos}
              </Text>
              <Text style={[styles.appointmentTime, { color: 'white' }]}>
                {formatearFecha(item.fecha)} - {formatearHora(item.hora)}
              </Text>
              <Text style={[styles.procedimientoText, { color: 'white' }]}>
                {item.procedimiento?.nombre || item.descripcion_manual || 'Sin procedimiento'}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyAppointments}>
          <Text style={styles.emptyText}>No hay citas próximas</Text>
        </View>
      )}
    </View>
  );
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#21588E', '#2FA0AD']}
        style={styles.headerGradient}
      >
        <View style={styles.greetingContainer}>
          <Text style={[styles.smallGreeting, { color: '#fff' }]}>¡Hola!</Text>
          <Text style={[styles.greeting, { color: '#fff' }]}>
            {getTimeBasedGreeting()}, {userData.doctor?.nombre || userData.usuario || 'Doctor'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar servicios..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
      </View>

      <Text style={styles.sectionTitle}>Servicios</Text>

      <View style={styles.gridContainer}>
        {filteredServices.map(service => (
          <TouchableOpacity 
            key={service.id} 
            style={styles.gridItem}
            onPress={() => handleServicePress(service.name)}
          >
            <Ionicons name={service.icon} size={32} color="#378DD0" />
            <Text style={styles.gridItemText}>{service.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderProximasCitas()}
      
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    height: 160,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  greetingContainer: {
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  smallGreeting: {
    fontSize: 17,
    fontWeight: '400',
    marginBottom: 5,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchContainer: {
    marginTop: -30,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 25,
    marginLeft: 20,
  },
  gridContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  gridItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: '1.65%',
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#77C4FF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  gridItemText: {
    marginTop: 8,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  appointmentsContainer: {
    marginTop: 10,
    marginHorizontal: 20,
    height: 140, // Reducido de 180 a 140
  },
  appointmentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10, // Reducido de 15 a 10
  },
  appointmentsList: {
    height: 100, // Reducido de 140 a 100
  },
  appointmentCard: {
    width: 200, // Reducido de 250 a 200
    backgroundColor: 'white',
    padding: 12, // Reducido de 15 a 12
    borderRadius: 12,
    marginRight: 10, // Reducido de 15 a 10
    borderWidth: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  patientName: {
    fontSize: 14, // Reducido de 16 a 14
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 12, // Reducido de 14 a 12
    color: '#666',
    marginBottom: 4,
  },
  procedimientoText: {
    fontSize: 12, // Reducido de 14 a 12
    color: '#666',
    fontStyle: 'italic',
  },
  emptyAppointments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
