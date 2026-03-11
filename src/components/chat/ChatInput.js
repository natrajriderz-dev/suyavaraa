// src/components/chat/ChatInput.js
const React = require('react');
const { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const Colors = require('../../theme/Colors');

const ChatInput = ({ value, onChangeText, onSend, onAttach, sending }) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TouchableOpacity style={styles.iconBtn} onPress={onAttach}>
          <Ionicons name="add" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          maxLength={1000}
        />
      </View>

      <TouchableOpacity
        style={[styles.sendBtn, (!value.trim() || sending) && styles.disabled]}
        onPress={onSend}
        disabled={!value.trim() || sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="send" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 24,
    paddingHorizontal: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBtn: { padding: 8 },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    paddingVertical: 10,
    maxHeight: 120,
    marginLeft: 4,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
});

module.exports = ChatInput;
