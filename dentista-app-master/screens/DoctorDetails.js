import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  TouchableOpacity,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function DoctorDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { doctorId } = route.params;

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUserRole();
    fetchDoctorDetails();
  }, [doctorId]);

  const checkUserRole = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setIsAdmin(user.rol === 'admin' || user.is_admin === 1);
      }
    } catch (error) {
      console.error('Error verificando rol de usuario:', error);
    }
  };

  const fetchDoctorDetails = async () => {
    setLoading(true);
    try {
      console.log(`Intentando obtener detalles del doctor con ID: ${doctorId}`);
      const response = await api.get(`/doctores/${doctorId}`);
      console.log('Respuesta completa de la API:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('Doctor obtenido exitosamente:', JSON.stringify(response.data, null, 2));
        setDoctor(response.data);
      } else if (response.message === 'Doctor no encontrado') {
        console.error('El doctor especificado no existe');
        Alert.alert(
          'Doctor no encontrado',
          'No se encontró el doctor solicitado. Es posible que haya sido eliminado.',
          [{ text: 'Volver', onPress: () => navigation.goBack() }]
        );
      } else {
        console.error('Error en la respuesta de la API:', response);
        Alert.alert('Error', response.message || 'No se pudieron cargar los detalles del doctor');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error detallado al obtener detalles del doctor:', {
        message: error.message,
        stack: error.stack,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : 'Sin respuesta del servidor',
        doctorId: doctorId,
        tipoDeId: typeof doctorId,
      });
      Alert.alert('Error', 'Hubo un problema al cargar los detalles del doctor');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('DoctorForm', { doctor });
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Está seguro de que desea eliminar este doctor? Esta acción no se puede deshacer y eliminará también el usuario asociado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.delete(`/doctores/${doctorId}`);
              console.log('Respuesta de eliminación:', JSON.stringify(response, null, 2));
              
              if (response.success) {
                Alert.alert('Éxito', response.message || 'Doctor eliminado correctamente');
                navigation.goBack();
              } else {
                console.error('Error al eliminar doctor, respuesta no válida:', response);
                Alert.alert('Error', response.message || 'No se pudo eliminar el doctor');
              }
            } catch (error) {
              console.error('Error eliminando doctor:', error);
              Alert.alert('Error', 'Hubo un problema al eliminar el doctor');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'activo': return '#4CAF50'; // Verde
      case 'inactivo': return '#F44336'; // Rojo
      case 'vacaciones': return '#FF9800'; // Naranja
      case 'licencia': return '#2196F3'; // Azul
      default: return '#9E9E9E'; // Gris
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#21588E" />
        <Text style={styles.loadingText}>Cargando información del doctor...</Text>
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#F44336" />
        <Text style={styles.errorText}>No se encontró información del doctor</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{doctor.nombre?.charAt(0).toUpperCase() || 'D'}</Text>
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.doctorName}>{doctor.nombre}</Text>
            <View style={styles.statusContainer}>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: getStatusColor(doctor.status) }
                ]} 
              />
              <Text style={styles.statusText}>{doctor.status || 'Desconocido'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#21588E" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Correo Electrónico</Text>
              <Text style={styles.infoValue}>{doctor.correo || 'No disponible'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#21588E" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{doctor.telefono || 'No disponible'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="medkit-outline" size={20} color="#21588E" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Especialidad</Text>
              <Text style={styles.infoValue}>{doctor.especialidad || 'No especificada'}</Text>
            </View>
          </View>
        </View>

        {doctor.user && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Información de Acceso</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#21588E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nombre de Usuario</Text>
                <Text style={styles.infoValue}>{doctor.user.usuario || 'No disponible'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="shield-outline" size={20} color="#21588E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Rol</Text>
                <Text style={styles.infoValue}>
                  {doctor.user.rol === 'admin' ? 'Administrador' : 'Doctor'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Sección adicional para más información si es necesario */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Información Adicional</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#21588E" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Fecha de Registro</Text>
              <Text style={styles.infoValue}>
                {doctor.created_at 
                  ? new Date(doctor.created_at).toLocaleDateString('es-ES') 
                  : 'No disponible'
                }
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#21588E" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Última Actualización</Text>
              <Text style={styles.infoValue}>
                {doctor.updated_at 
                  ? new Date(doctor.updated_at).toLocaleDateString('es-ES') 
                  : 'No disponible'
                }
              </Text>
            </View>
          </View>
        </View>

        {isAdmin && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={22} color="#fff" />
              <Text style={styles.actionButtonText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text style={styles.actionButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#21588E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  nameContainer: {
    flex: 1,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#444',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  editButton: {
    backgroundColor: '#21588E',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#21588E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
