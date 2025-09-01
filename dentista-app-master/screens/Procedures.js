import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

export default function Procedures() {
  const navigation = useNavigation();
  const [procedures, setProcedures] = useState([]);
  const [filteredProcedures, setFilteredProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProcedures();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProcedures(procedures);
    } else {
      const filtered = procedures.filter(procedure => 
        procedure.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (procedure.descripcion && procedure.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredProcedures(filtered);
    }
  }, [searchQuery, procedures]);

  const fetchProcedures = () => {
    setLoading(true);
    console.log('Intentando obtener procedimientos de la API...');
    
    axios.get('https://dentist-app-0fcf42a43c96.herokuapp.com/api/procedimientos')
      .then(response => {
        console.log('Respuesta recibida:', JSON.stringify(response.data, null, 2));
        
        if (Array.isArray(response.data)) {
          console.log(`Se cargaron ${response.data.length} procedimientos correctamente`);
          setProcedures(response.data);
          setFilteredProcedures(response.data);
        } else {
          console.error('Formato de respuesta inesperado:', response.data);
          Alert.alert('Error', 'Los datos recibidos no tienen el formato esperado.');
        }
        
        setLoading(false);
      })
      .catch(error => {
        const errorDetails = {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        };
        console.error('Error detallado al cargar procedimientos:', JSON.stringify(errorDetails, null, 2));
        
        let errorMessage = 'Hubo un problema al conectar con el servidor.';
        
        if (error.response) {
          errorMessage += ` Código: ${error.response.status}`;
          if (error.response.data && error.response.data.message) {
            errorMessage += `. ${error.response.data.message}`;
          }
        } else if (error.request) {
          errorMessage += ' No se recibió respuesta del servidor.';
        } else {
          errorMessage += ` Detalle: ${error.message}`;
        }
        
        Alert.alert('Error', errorMessage);
        setLoading(false);
      });
  };

  const deleteProcedure = (id) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro que deseas eliminar este procedimiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            setLoading(true);
            console.log(`Intentando eliminar procedimiento con ID: ${id}`);
            
            axios.delete(`https://dentist-app-0fcf42a43c96.herokuapp.com/api/procedimientos/${id}`)
              .then(response => {
                console.log('Respuesta de eliminación:', JSON.stringify(response, null, 2));
                
                // La eliminación con código 204 No Content es exitosa pero no tiene body
                setProcedures(procedures.filter(procedure => procedure.id !== id));
                console.log(`Procedimiento con ID ${id} eliminado correctamente`);
                Alert.alert('Éxito', 'Procedimiento eliminado correctamente.');
                
                setLoading(false);
              })
              .catch(error => {
                const errorDetails = {
                  message: error.message,
                  status: error.response?.status,
                  statusText: error.response?.statusText,
                  data: error.response?.data
                };
                console.error(`Error detallado al eliminar procedimiento ${id}:`, JSON.stringify(errorDetails, null, 2));
                
                let errorMessage = 'Hubo un problema al conectar con el servidor.';
                
                if (error.response) {
                  switch (error.response.status) {
                    case 404:
                      errorMessage = 'El procedimiento no existe o ya ha sido eliminado.';
                      break;
                    case 403:
                      errorMessage = 'No tienes permisos para eliminar este procedimiento.';
                      break;
                    case 401:
                      errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
                      Alert.alert('Sesión expirada', errorMessage, [
                        { text: 'OK', onPress: () => navigation.replace('Login') }
                      ]);
                      return;
                    default:
                      errorMessage = `Error al eliminar: ${error.response.status}`;
                  }
                  
                  if (error.response.data && error.response.data.message) {
                    errorMessage += ` Detalle: ${error.response.data.message}`;
                  }
                }
                
                Alert.alert('Error', errorMessage);
                setLoading(false);
              });
          }
        }
      ]
    );
  };

  const handleAddProcedure = () => {
    navigation.navigate('ProcedureForm', { refresh: fetchProcedures });
  };

  const handleEditProcedure = (procedure) => {
    navigation.navigate('ProcedureForm', { procedure, refresh: fetchProcedures });
  };

  const handleViewProcedure = (procedureId) => {
    const procedure = procedures.find(p => p.id === procedureId);
    if (procedure) {
      // Opcionalmente, navegar a una vista detallada o simplemente mostrar un Alert
      Alert.alert(
        procedure.nombre,
        procedure.descripcion || 'Sin descripción',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'No se encontraron datos del procedimiento');
    }
  };

  const renderProcedureItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.procedureCard}
      onPress={() => handleViewProcedure(item.id)}
    >
      <View style={styles.procedureInfo}>
        <Text style={styles.procedureName}>{item.nombre}</Text>
        {item.descripcion ? (
          <Text style={styles.procedureDescription} numberOfLines={2}>
            {item.descripcion}
          </Text>
        ) : (
          <Text style={styles.procedureNoDescription}>Sin descripción</Text>
        )}
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => handleEditProcedure(item)}
        >
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => deleteProcedure(item.id)}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Procedimientos</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddProcedure}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar procedimientos..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#21588E" />
        </View>
      ) : (
        <>
          {filteredProcedures.length > 0 ? (
            <FlatList
              data={filteredProcedures}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderProcedureItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="medkit-outline" size={60} color="#cccccc" />
              <Text style={styles.emptyText}>
                No se encontraron procedimientos
              </Text>
              {searchQuery ? (
                <Text style={styles.emptySubText}>
                  Intenta con otra búsqueda
                </Text>
              ) : (
                <Text style={styles.emptySubText}>
                  Agrega tu primer procedimiento
                </Text>
              )}
            </View>
          )}
        </>
      )}

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={handleAddProcedure}
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    borderRadius: 15,
    marginHorizontal: 20,
    marginTop: 15,
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
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 90,
  },
  procedureCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    marginVertical: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  procedureInfo: {
    flex: 1,
  },
  procedureName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#21588E',
    marginBottom: 5,
  },
  procedureDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  procedureNoDescription: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#999',
  },
  actionButtons: {
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 3,
  },
  editButton: {
    backgroundColor: '#378DD0',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#21588E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 15,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
});
