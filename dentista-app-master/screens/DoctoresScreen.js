import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function DoctoresScreen() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
    const mode = route.params?.mode;
  const onSelect = route.params?.onSelect;
  
  useFocusEffect(
    React.useCallback(() => {
      checkUserRole();
      fetchDoctors();
    }, [])
  );

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

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      console.log('Intentando obtener la lista de doctores de la API...');
      const response = await api.get('/doctores');
      console.log('Respuesta completa de API doctores:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log(`Doctores obtenidos exitosamente. Cantidad: ${response.data?.length || 0}`);
        setDoctors(response.data || []);
      } else {
        console.error('Error en la respuesta de la API:', response);
        Alert.alert('Error', 'No se pudieron cargar los doctores');
      }
    } catch (error) {
      console.error('Error detallado al obtener doctores:', {
        message: error.message,
        stack: error.stack,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : 'Sin respuesta del servidor',      });
      Alert.alert('Error', 'Hubo un problema al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doctorId) => {
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
                Alert.alert('Éxito', 'Doctor eliminado correctamente');
                fetchDoctors();
              } else {
                console.error('Error al eliminar doctor:', response.message);
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

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doctor => {
      const searchLower = searchQuery.toLowerCase();
      return (
        doctor.nombre?.toLowerCase().includes(searchLower) ||
        doctor.especialidad?.toLowerCase().includes(searchLower) ||
        doctor.correo?.toLowerCase().includes(searchLower)
      );
    });
  }, [doctors, searchQuery]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'activo': return '#4CAF50';
      case 'inactivo': return '#F44336';
      case 'vacaciones': return '#FF9800';
      case 'licencia': return '#2196F3';
      default: return '#9E9E9E';
    }
  };
  const renderDoctorItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.doctorCard}
        onPress={() => {
          if (mode === 'select' && onSelect) {
            // Al seleccionar un doctor en modo de selección, solo pasamos el ID y nombre necesarios
            console.log(`Doctor seleccionado: ID=${item.id}, Nombre=${item.nombre}`);
            onSelect({
              id: item.id,
              nombre: item.nombre
            });
            return;
          }
          
          // Comportamiento normal para ver detalles
          navigation.navigate('DoctorDetails', { 
            doctorId: item.id
          });
        }}
      >
        <View style={styles.doctorCardContent}>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{item.nombre}</Text>
            <Text style={styles.doctorSpecialty}>{item.especialidad || 'Sin especialidad'}</Text>
            <Text style={styles.doctorEmail}>{item.correo}</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={styles.statusText}>{item.status || 'Desconocido'}</Text>
            </View>
          </View>

          {isAdmin && mode !== 'select' && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => navigation.navigate('DoctorForm', { doctor: item })}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          
          {mode === 'select' && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, {backgroundColor: '#4CAF50'}]}
                onPress={() => {
                  console.log(`Seleccionando doctor con botón: ID=${item.id}`);
                  onSelect({
                    id: item.id,
                    nombre: item.nombre
                  });
                }}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#21588E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'select' ? 'Seleccionar Doctor' : 'Doctores'}
        </Text>
        <View style={styles.headerRight} />
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar doctores..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#21588E" />
        </View>
      ) : (
        <FlatList
          data={filteredDoctors}
          keyExtractor={item => item.id.toString()}
          renderItem={renderDoctorItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron doctores</Text>
            </View>
          }
        />
      )}

      {isAdmin && mode !== 'select' && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => navigation.navigate('DoctorForm')}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#21588E',
  },
  headerRight: {
    width: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },  searchIcon: {
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
  },
  doctorCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  doctorCardContent: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#21588E',
    marginBottom: 5,
  },
  doctorSpecialty: {
    fontSize: 16,
    color: '#555',
    marginBottom: 3,
  },
  doctorEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 90,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#21588E',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
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
