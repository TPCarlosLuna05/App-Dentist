import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function AdminScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const userData = route.params?.userData || {};
  const [searchQuery, setSearchQuery] = useState('');
  const [citasRecientes, setCitasRecientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const services = [
    { id: 1, name: 'Agenda', icon: 'calendar' },
    { id: 2, name: 'Citas', icon: 'medical' },
    { id: 3, name: 'Pacientes', icon: 'people' },
    { id: 4, name: 'Historial', icon: 'time' },
    { id: 5, name: 'Doctores', icon: 'medkit' },
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
      navigation.navigate('AdminCalendar');
    }
    if (serviceName === 'Citas') {
      navigation.navigate('ConsultasScreen');
    }
    if (serviceName === 'Pacientes') {
      navigation.navigate('Patients');
    }
    if (serviceName === 'Historial') {
      navigation.navigate('DoctoresScreen', {
        mode: 'select',
        onSelect: (doctor) => {
          if (!doctor || !doctor.id) {
            Alert.alert('Error', 'No se pudo obtener el ID del doctor');
            return;
          }
          navigation.navigate('HistorialCitasDoctor', {
            doctorId: doctor.id,
            doctorNombre: doctor.nombre
          });
        }
      });
    }
    if (serviceName === 'Doctores') {
      navigation.navigate('DoctoresScreen');
    }
    if (serviceName === 'Servicios') {
      navigation.navigate('Servicios');
    }
  };

  const handleLogout = () => {
    navigation.replace('Login');
  };

  useFocusEffect(
    React.useCallback(() => {
      cargarCitasRecientes();
    }, [])
  );
  const cargarCitasRecientes = async () => {
    try {
      setLoading(true);
      // Ruta para administradores: obtener todas las citas
      const response = await api.get('/citas');

      if (response.success) {
        const hoy = new Date();
        const tresDiasAtras = new Date(hoy);
        tresDiasAtras.setDate(hoy.getDate() - 3);

        const citasFiltradas = response.data
          .filter(cita => {
            const fechaCita = new Date(cita.fecha);
            return fechaCita >= tresDiasAtras && fechaCita <= hoy;
          })
          .sort((a, b) => {
            const dateA = new Date(a.fecha + 'T' + a.hora);
            const dateB = new Date(b.fecha + 'T' + b.hora);
            return dateA - dateB;
          });

        setCitasRecientes(citasFiltradas);
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
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    });
  };

  const formatearHora = (hora) => {
    if (!hora) return '';
    return hora.substring(0, 5);
  };

  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return '#FF9800';
      case 'completada': return '#4CAF50';
      case 'cancelada': return '#F44336';
      default: return '#757575';
    }
  };

  const renderCitasRecientes = () => (
    <View style={styles.citasContainer}>
      <Text style={styles.citasTitle}>Citas Recientes (Últimos 3 días)</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#21588E" />
      ) : citasRecientes.length > 0 ? (
        <FlatList
          data={citasRecientes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.citaCard}
              onPress={() => navigation.navigate('CitaDetails', { citaId: item.id })}
            >
              <View style={styles.citaHeader}>
                <Text style={styles.fechaText}>{formatearFecha(item.fecha)}</Text>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
                  <Text style={styles.estadoText}>{item.estado}</Text>
                </View>
              </View>
              <View style={styles.citaBody}>
                <Text style={styles.horaText}>{formatearHora(item.hora)}</Text>
                <Text style={styles.pacienteText}>
                  {item.paciente?.nombre} {item.paciente?.apellidos}
                </Text>
                <Text style={styles.doctorText}>Dr. {item.doctor?.nombre}</Text>
                <Text style={styles.procedimientoText}>
                  {item.procedimiento?.nombre || item.descripcion_manual || 'Sin procedimiento'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyCitas}>
          <Text style={styles.emptyText}>No hay citas en los últimos 3 días</Text>
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
            {getTimeBasedGreeting()}, {userData.doctor?.nombre || userData.usuario || 'Administrador'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
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

        {renderCitasRecientes()}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  greetingContainer: {
    padding: 20,
    paddingTop: 50,
  },
  smallGreeting: {
    fontSize: 17,
    fontWeight: '400',
    marginBottom: 5,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    borderRadius: 15,
    marginBottom: 20,
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
    marginBottom: 15,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
  citasContainer: {
    flex: 1,
    marginBottom: 70,
    maxHeight: 300, // Limitar altura máxima
  },
  citasTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  citaCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  citaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fechaText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  citaBody: {
    marginLeft: 4,
  },
  horaText: {
    fontSize: 13,
    color: '#21588E',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pacienteText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  doctorText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  procedimientoText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyCitas: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  logoutButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
