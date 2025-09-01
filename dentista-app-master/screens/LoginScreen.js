import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

// Cambiamos de función nombrada a exportación por defecto
export default function LoginScreen() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [password, setPassword] = useState('');
  const navigation = useNavigation();
  useEffect(() => {    // Consulta inicial para verificar si hay conexión con el servidor
    console.log('Verificando conexión con el servidor...');
    axios.get('https://dentist-app-0fcf42a43c96.herokuapp.com/api/doctores')
      .then(response => {
        console.log('Conexión exitosa con el servidor');
        setDoctors(response.data.status === 'success' ? response.data.data : Array.isArray(response.data) ? response.data : []);
      })
      .catch(error => {
        console.error('Error al conectar con el servidor:', error);
        Alert.alert('Error', 'Hubo un problema al conectar con el servidor.');
      });
  }, []);

  const handleLogin = async () => {
    if (!selectedDoctor || !password) {
      Alert.alert('Error', 'Por favor selecciona un doctor e ingresa la contraseña.');
      return;
    }    try {      console.log('Iniciando sesión...');
      const response = await axios.post('https://dentist-app-0fcf42a43c96.herokuapp.com/api/login', {
        id_doctor: selectedDoctor,
        password: password
      });

      console.log('Respuesta de login:', response.data);

      if (response.data.status === 'success') {
        // Extraer información del usuario y token
        const userData = response.data.data.user;
        const token = response.data.data.token || response.data.token;
        
        // Asegurar que tenemos una estructura consistente de datos
        const userDataToStore = {
          id: userData.id,
          doctor_id: userData.doctor?.id || userData.id,
          nombre: userData.doctor?.nombre || userData.nombre || userData.usuario,
          rol: userData.rol || (userData.is_admin ? 'admin' : 'doctor'),
          is_admin: userData.is_admin || userData.rol === 'admin',
          usuario: userData.usuario,
          doctor: userData.doctor || {
            id: userData.id,
            nombre: userData.nombre || userData.usuario,
          }
        };
          // Guardar el token y datos del usuario
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userDataToStore));
        
        // Guardar ID y nombre del doctor para uso directo en otras pantallas
        if (userDataToStore.doctor?.id) {
          await AsyncStorage.setItem('doctorId', userDataToStore.doctor.id.toString());
          await AsyncStorage.setItem('doctorName', userDataToStore.doctor.nombre || '');
          console.log('ID del doctor guardado:', userDataToStore.doctor.id);
        }
        
        console.log('Datos de usuario guardados:', userDataToStore);
        
        // Navegar según el rol del usuario
        if (userDataToStore.is_admin || userDataToStore.rol === 'admin') {
          navigation.replace('Admin', { userData: userDataToStore });
        } else {
          navigation.replace('Home', { userData: userDataToStore });
        }
      } else {
        Alert.alert('Error', 'Credenciales incorrectas.');
      }
    } catch (error) {
      console.error('Error de login:', error.response?.data || error.message);
      
      let errorMessage = 'Hubo un problema al iniciar sesión.';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Credenciales incorrectas.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      Alert.alert('Error', errorMessage);
    }
  };  return (
    <SafeAreaView style={{flex: 1}}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{flex: 1}}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Iniciar Sesión</Text>
          
          <View style={styles.doctorListContainer}>
            <FlatList
              data={doctors}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.doctorItem,
                    selectedDoctor === item.id && styles.selectedDoctorItem
                  ]}
                  onPress={() => setSelectedDoctor(item.id)}
                >
                  <Text style={styles.doctorName}>{item.nombre}</Text>
                  <Text style={styles.doctorEmail}>{item.correo}</Text>
                </TouchableOpacity>
              )}
              style={styles.doctorList}
              showsVerticalScrollIndicator={true}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'space-between',
  },
  doctorListContainer: {
    flex: 1,
    maxHeight: 300,
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#21588E',
  },
  doctorList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  doctorItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedDoctorItem: {
    borderColor: '#21588E',
    backgroundColor: '#e6f0f9',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  doctorEmail: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#21588E',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
